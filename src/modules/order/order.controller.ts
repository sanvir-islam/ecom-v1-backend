import type { Request, Response } from "express";
import * as OrderService from "./order.service.js";
import * as PaymentService from "../payment/payment.service.js";
import { createOrderSchema, orderIdParamSchema, updateOrderStatusSchema } from "./order.schema.js";
import { AppError } from "../../middleware/errorHandler.js";
import { reminderQueue, emailQueue } from "../../config/queue.js";
import { getAbandonedCartTemplate } from "../../templates/abandoned-cart.template.js";
import { Order } from "./order.model.js";
import { Product } from "../product/product.model.js";
import { verifyShippoRate } from "../shipping/shipping.service.js";
import { env } from "../../config/env.js";

export async function createOrderHandler(req: Request, res: Response) {
  try {
    // Only the frontend proxy is allowed to create orders
    const proxySecret = process.env.PROXY_SECRET;
    if (proxySecret && req.headers["x-proxy-secret"] !== proxySecret) {
      return res.status(403).json({ message: "Direct order creation is not allowed" });
    }

    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

    // 1. Verify shipping rate price matches what Shippo actually charges (tamper prevention)
    const shippoRate = await verifyShippoRate(parsed.data.shippoRateId);
    const priceDiff = Math.abs(shippoRate.amount - parsed.data.shippingCost);
    if (priceDiff > 0.01) {
      return res.status(400).json({
        message: `Shipping cost mismatch. Expected $${shippoRate.amount.toFixed(2)}, got $${parsed.data.shippingCost.toFixed(2)}. Please refresh and try again.`,
      });
    }

    // 2. Create the pending order in MongoDB
    const order = await OrderService.createPendingOrder(parsed.data);

    // 3. Generate the Stripe Checkout Link
    const checkoutUrl = await PaymentService.createCheckoutSession(order);

    // 4. Schedule abandoned cart reminder — fires in 2.5 hours if still unpaid
    await reminderQueue.add(
      "abandoned-cart-check",
      {
        orderId: order._id.toString(),
        email: order.email,
        firstName: order.shippingAddress.firstName,
      },
      { delay: 2.5 * 60 * 60 * 1000 },
    );

    return res.status(201).json({
      message: "Order initialized, redirecting to payment...",
      checkoutUrl,
      orderId: order._id,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Create Order Error:", error);
    return res.status(500).json({ message: "Failed to create order" });
  }
}

export async function getAllOrdersHandler(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await OrderService.getAllOrders(page, limit);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Get All Orders Error:", error);
    return res.status(500).json({ message: "Internal server error fetching orders" });
  }
}

export async function getOrderBySessionHandler(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ message: "Session ID is required" });

    const order = await OrderService.getOrderBySessionId(sessionId as string);

    // Data Masking for public receipt
    const safeOrder = {
      _id: order._id,
      items: order.items,
      totalAmount: order.totalAmount,
      shippingCost: order.shippingCost,
      discountAmount: order.discountAmount ?? 0,
      discountCode: order.discountCode ?? null,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      customerFirstName: order.shippingAddress.firstName,
      shippingCity: order.shippingAddress.city,
      createdAt: order.createdAt,
    };

    return res.status(200).json(safeOrder);
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Get Order by Session Error:", error);
    return res.status(500).json({ message: "Failed to fetch order details" });
  }
}

export async function getOrdersByEmailHandler(req: Request, res: Response) {
  try {
    const { email } = req.query;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email query param is required" });
    }
    const orders = await OrderService.getOrdersByEmail(email);
    return res.status(200).json({ data: orders, total: orders.length });
  } catch (error) {
    console.error("Get Orders By Email Error:", error);
    return res.status(500).json({ message: "Failed to fetch orders for this customer" });
  }
}

export async function getUnpaidOrdersHandler(req: Request, res: Response) {
  try {
    const orders = await OrderService.getUnpaidOrders();
    return res.status(200).json({ data: orders, total: orders.length });
  } catch (error) {
    console.error("Get Unpaid Orders Error:", error);
    return res.status(500).json({ message: "Failed to fetch unpaid orders" });
  }
}

export async function getCustomersHandler(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const result = await OrderService.getAggregatedCustomers(page, limit);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Get Customers Error:", error);
    return res.status(500).json({ message: "Failed to fetch customers" });
  }
}

export async function sendManualReminderHandler(req: Request, res: Response) {
  try {
    const paramsParsed = orderIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) return res.status(400).json({ errors: paramsParsed.error.issues });

    const order = await OrderService.getOrderById(paramsParsed.data.id);

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ message: "Order is already paid — no reminder needed" });
    }

    // Stock check — don't send reminder for items that are now out of stock
    for (const item of order.items) {
      const product = await Product.findOne({ _id: item.productId, "variants._id": item.variantId });
      const variant = product?.variants.find((v) => v._id?.toString() === item.variantId.toString());
      if (!variant || variant.stock < item.quantity) {
        return res.status(400).json({ message: `Cannot send reminder — ${item.name} (${item.sizeLabel}) is out of stock` });
      }
    }

    const resumeUrl = `${env.API_URL}/api/order/${order._id}/resume`;
    const html = getAbandonedCartTemplate(
      order.shippingAddress.firstName,
      order.items,
      order.totalAmount,
      resumeUrl,
      order.shippingCost ?? 0,
      order.discountAmount ?? 0,
    );

    await emailQueue.add("send-manual-reminder", {
      type: "ABANDONED_CART",
      to: order.email,
      subject: "Your order is still waiting — The California Pickle",
      html,
    });

    console.log(`✉️ Manual reminder sent by admin for order ${order._id} to ${order.email}`);
    return res.status(200).json({ message: `Reminder email sent to ${order.email}` });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Send Manual Reminder Error:", error);
    return res.status(500).json({ message: "Failed to send reminder" });
  }
}

// Public — called when customer clicks "Complete My Order" in reminder email.
// Checks stock before redirecting to Stripe — prevents paying for sold-out items.
export async function resumeOrderHandler(req: Request, res: Response) {
  const outOfStockUrl = `${env.FRONTEND_URL}/checkout/out-of-stock`;

  try {
    const paramsParsed = orderIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) return res.redirect(outOfStockUrl);

    const order = await OrderService.getOrderById(paramsParsed.data.id);

    // Already paid — send to order confirmation
    if (order.paymentStatus === "paid") {
      return res.redirect(`${env.FRONTEND_URL}/order/session/${order.stripeSessionId}`);
    }

    // Check stock for all items before touching Stripe
    for (const item of order.items) {
      const product = await Product.findOne({ _id: item.productId, "variants._id": item.variantId });
      const variant = product?.variants.find((v) => v._id?.toString() === item.variantId.toString());
      if (!variant || variant.stock < item.quantity) {
        console.log(`⚠️ Resume blocked for order ${order._id} — ${item.name} (${item.sizeLabel}) out of stock`);
        return res.redirect(outOfStockUrl);
      }
    }

    // Stock ok — get a valid checkout URL (regenerate if session expired)
    let checkoutUrl = order.checkoutUrl;
    if (!checkoutUrl || order.paymentStatus === "failed") {
      checkoutUrl = await PaymentService.createCheckoutSession(order);
      await Order.findByIdAndUpdate(order._id, { paymentStatus: "pending", orderStatus: "pending_payment" });
    }

    return res.redirect(checkoutUrl!);
  } catch {
    return res.redirect(outOfStockUrl);
  }
}

export async function updateOrderStatusHandler(req: Request, res: Response) {
  try {
    const paramsParsed = orderIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) return res.status(400).json({ errors: paramsParsed.error.issues });

    const bodyParsed = updateOrderStatusSchema.safeParse(req.body);
    if (!bodyParsed.success) return res.status(400).json({ errors: bodyParsed.error.issues });

    const updatedOrder = await OrderService.updateOrderStatus(paramsParsed.data.id, bodyParsed.data.orderStatus);

    return res.status(200).json({
      message: `Order marked as ${updatedOrder.orderStatus}`,
      order: updatedOrder,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Update Order Status Error:", error);
    return res.status(500).json({ message: "Internal server error updating order" });
  }
}
