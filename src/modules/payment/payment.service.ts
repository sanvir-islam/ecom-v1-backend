import Stripe from "stripe";
import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { Order } from "../order/order.model.js";
import { Product } from "../product/product.model.js";
import { emailQueue } from "../../config/queue.js";
import { getOrderReceiptTemplate } from "../../templates/order.template.js";
import { getShippingTemplate } from "../../templates/shipping.template.js";
import { purchaseShippingLabel } from "../shipping/shipping.service.js";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);

// ─── Create Stripe Checkout Session ─────────────────────────────────────────
// Shipping cost comes from Shippo rate selected on frontend — added as a line item
export async function createCheckoutSession(order: any) {
  const lineItems = order.items.map((item: any) => ({
    price_data: {
      currency: "usd",
      product_data: { name: `${item.name} - ${item.sizeLabel}` },
      unit_amount: Math.round(item.priceAtPurchase * 100),
    },
    quantity: item.quantity,
  }));

  // Shipping is a separate line item — customer already selected carrier on our form
  if (order.shippingCost > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Shipping" },
        unit_amount: Math.round(order.shippingCost * 100),
      },
      quantity: 1,
    });
  }

  // Stripe Checkout does not support negative unit_amount on line items.
  // Use Stripe's native coupon + discounts[] instead — this shows as a proper
  // discount line on the Stripe-hosted page and the math still holds for the fraud check.
  let stripeCouponId: string | undefined;
  if (order.discountAmount > 0) {
    const stripeCoupon = await stripe.coupons.create({
      amount_off: Math.round(order.discountAmount * 100),
      currency: "usd",
      duration: "once",
      max_redemptions: 1,
      name: order.discountCode ? `Coupon: ${order.discountCode}` : "Discount",
    });
    stripeCouponId = stripeCoupon.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.email,
    line_items: lineItems,
    ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
    client_reference_id: order._id.toString(),
    success_url: `${env.FRONTEND_URL}/order/session/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.FRONTEND_URL}/checkout`,
  });

  order.stripeSessionId = session.id;
  order.checkoutUrl = session.url;
  await order.save();

  return session.url;
}

// ─── Stripe Webhook Handler ──────────────────────────────────────────────────
export async function handleStripeWebhook(signature: string, rawBody: Buffer) {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    throw new Error(`Webhook Verification Failed: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.client_reference_id;

    if (orderId) {
      const dbSession = await mongoose.startSession();
      dbSession.startTransaction();

      try {
        const order = await Order.findOne({ _id: orderId, paymentStatus: "pending" }).session(dbSession);

        if (!order) {
          await dbSession.abortTransaction();
          dbSession.endSession();
          console.log(`ℹ️ Webhook duplicate or order ${orderId} already processed.`);
          return { received: true };
        }

        // Fraud check: expected = what Stripe actually charges
        // order.totalAmount is already (productsSubtotal - discount), so:
        // Stripe amount_total = order.totalAmount + shippingCost
        // (Stripe line items are full-price + shipping, then coupon applied for discountAmount)
        if (session.amount_total == null) {
          throw new Error(`Missing amount_total in Stripe session for order ${orderId}`);
        }
        const expectedCents = Math.round((order.totalAmount + order.shippingCost) * 100);
        if (session.amount_total !== expectedCents) {
          throw new Error(
            `Payment amount mismatch for order ${orderId}: expected ${expectedCents} cents, got ${session.amount_total} cents`,
          );
        }

        order.paymentStatus = "paid";
        order.orderStatus = "processing";
        order.stripePaymentIntentId = session.payment_intent as string;
        await order.save({ session: dbSession });

        for (const item of order.items) {
          const updatedProduct = await Product.findOneAndUpdate(
            { _id: item.productId, "variants._id": item.variantId },
            { $inc: { "variants.$.stock": -item.quantity } },
            { new: true, session: dbSession },
          );

          if (updatedProduct) {
            const variant = updatedProduct.variants.find((v) => v._id?.toString() === item.variantId.toString());
            if (variant) {
              if (variant.stock < 0) {
                console.log(`🚨 OVERSELL ALERT: ${updatedProduct.name} (${variant.sizeLabel}) stock: ${variant.stock}`);
              }
              if (variant.stock <= 0 && variant.stockStatus !== "OUT_OF_STOCK") {
                await Product.updateOne(
                  { _id: item.productId, "variants._id": item.variantId },
                  { $set: { "variants.$.stockStatus": "OUT_OF_STOCK" } },
                  { session: dbSession },
                );
              }
            }
          }
        }

        await dbSession.commitTransaction();
        dbSession.endSession();
        console.log(`✅ Order ${orderId} paid & inventory updated.`);

        // Send order confirmation email
        const receiptHtml = getOrderReceiptTemplate(
          order.shippingAddress.firstName,
          order._id.toString(),
          order.totalAmount,
          order.items,
          order.shippingAddress,
          order.shippingCost,
          order.discountAmount ?? 0,
          order.discountCode ?? undefined,
        );

        await emailQueue.add("send-order-receipt", {
          type: "ORDER_CONFIRMATION",
          to: order.email,
          subject: "Order Confirmed - The California Pickle 🥒",
          html: receiptHtml,
        });

        // Auto-purchase Shippo label (non-blocking — label failure doesn't rollback payment)
        if (order.shippoRateId) {
          try {
            const label = await purchaseShippingLabel(order.shippoRateId);

            await Order.findByIdAndUpdate(orderId, {
              trackingNumber: label.trackingNumber,
              trackingUrl: label.trackingUrl,
              shippingLabelUrl: label.labelUrl,
              shippingCarrier: label.carrier,
              orderStatus: "shipped",
            });

            const shippingHtml = getShippingTemplate(
              order.shippingAddress.firstName,
              order._id.toString(),
              label.trackingNumber,
              label.trackingUrl,
              label.carrier,
            );

            await emailQueue.add("send-shipping-notification", {
              type: "SHIPPED",
              to: order.email,
              subject: "Your order is on the way — The California Pickle 🥒",
              html: shippingHtml,
            });

            console.log(`📦 Label purchased & tracking email queued for order ${orderId}`);
          } catch (labelError: any) {
            // Label failure is logged but does NOT fail the webhook
            // Admin can manually purchase label from Shippo dashboard
            console.error(`⚠️ Shippo label purchase failed for order ${orderId}:`, labelError.message);
          }
        }
      } catch (error) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        console.error("🚨 Webhook transaction failed & rolled back:", error);
        throw error;
      }
    }
  } else if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.client_reference_id;

    if (orderId) {
      await Order.findOneAndUpdate(
        { _id: orderId, paymentStatus: "pending" },
        { paymentStatus: "failed" },
      );
      console.log(`⌛ Stripe session expired for order ${orderId} — marked as failed.`);
    }
  } else {
    console.log(`ℹ️ Unhandled Stripe Event: ${event.type}`);
  }

  return { received: true };
}
