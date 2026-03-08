import Stripe from "stripe";
import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { Order } from "../order/order.model.js";
import { Product } from "../product/product.model.js";
import { emailQueue } from "../../config/queue.js";
import { getOrderReceiptTemplate } from "../../templates/order.template.js";

// 1. Initialize Stripe
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any,
});

// 2. Generate the Secure Checkout Page with Shipping Fees
export async function createCheckoutSession(order: any) {
  const lineItems = order.items.map((item: any) => {
    return {
      price_data: {
        currency: "usd",
        product_data: {
          name: `${item.name} - ${item.sizeLabel}`,
        },
        unit_amount: Math.round(item.priceAtPurchase * 100),
      },
      quantity: item.quantity,
    };
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: order.email,
    line_items: lineItems,
    client_reference_id: order._id.toString(),
    success_url: `http://localhost:${env.PORT}/api/order/session/{CHECKOUT_SESSION_ID}`,
    cancel_url: `http://localhost:${env.PORT}/api/order/session/{CHECKOUT_SESSION_ID}`,

    // STRICTLY US ONLY
    shipping_address_collection: {
      allowed_countries: ["US"],
    },

    // DYNAMIC SHIPPING FEES
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: 500, // $5.00 in CENTS
            currency: "usd",
          },
          display_name: "Standard US Shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 5 },
          },
        },
      },
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 1500, currency: "usd" }, // $15.00
          display_name: "Overnight Express",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 1 },
            maximum: { unit: "business_day", value: 1 },
          },
        },
      },
    ],
  });

  order.stripeSessionId = session.id;
  order.checkoutUrl = session.url;
  await order.save();

  return session.url;
}

// 3. The Webhook Handler (Enterprise-Grade with Transactions & Atomic Updates)
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
                console.log(
                  `🚨 OVERSELL ALERT: ${updatedProduct.name} (${variant.sizeLabel}) has dropped to ${variant.stock}! Contact customer for refund.`,
                );
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

        console.log(`✅ Order ${orderId} Paid & Inventory Updated Atomically!`);

        const htmlContent = getOrderReceiptTemplate(
          order.shippingAddress.firstName,
          order._id.toString(),
          order.totalAmount,
          order.items,
          order.shippingAddress,
        );

        await emailQueue.add("send-order-receipt", {
          type: "ORDER_CONFIRMATION",
          to: order.email,
          subject: "Order Confirmed - The California Pickle 🥒",
          html: htmlContent,
        });

        console.log(`✉️ Added Order Confirmation to Redis queue for ${order.email}`);
      } catch (error) {
        await dbSession.abortTransaction();
        dbSession.endSession();
        console.error("🚨 Webhook Transaction Failed & Rolled Back:", error);
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
