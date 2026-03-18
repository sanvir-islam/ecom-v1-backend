import { Product } from "../product/product.model.js";
import { Order } from "./order.model.js";
import type { CreateOrderDTO } from "./order.schema.js";
import { AppError } from "../../middleware/errorHandler.js";

const cleanData = <T>(data: T): any => JSON.parse(JSON.stringify(data));

export async function createPendingOrder(data: CreateOrderDTO) {
  let calculatedTotal = 0;
  const processedItems = [];

  // 1. The Aggregator (Merges duplicate items in the cart to stop hackers)
  const aggregatedItems = new Map<string, any>();
  for (const item of data.items) {
    // We create a unique key using the product and variant ID
    const key = `${item.productId}-${item.variantId}`;
    if (aggregatedItems.has(key)) {
      // If it exists, just add the quantity together!
      aggregatedItems.get(key).quantity += item.quantity;
    } else {
      aggregatedItems.set(key, { ...item });
    }
  }

  // Now we loop through the MERGED items, not the raw payload
  const mergedItems = Array.from(aggregatedItems.values());

  for (const item of mergedItems) {
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive || product.isDeleted) {
      throw new AppError(`Product ${item.productId} is unavailable`, 400);
    }

    const variant = product.variants.find((v) => v._id?.toString() === item.variantId);
    if (!variant) {
      throw new AppError(`Variant not found for product ${product.name}`, 404);
    }

    // Now this accurately checks the TRUE total quantity!
    if (variant.stock < item.quantity) {
      throw new AppError(
        `Not enough stock for ${product.name} (${variant.sizeLabel}). Only ${variant.stock} left.`,
        400,
      );
    }

    processedItems.push({
      productId: product._id,
      variantId: variant._id,
      name: product.name,
      sizeLabel: variant.sizeLabel,
      quantity: item.quantity,
      priceAtPurchase: variant.price,
    });

    calculatedTotal += variant.price * item.quantity;
  }

  const rawOrderData = {
    email: data.email,
    shippingAddress: data.shippingAddress,
    items: processedItems,
    totalAmount: calculatedTotal,
    shippingCost: data.shippingCost,
    shippoRateId: data.shippoRateId,
    paymentStatus: "pending",
  };

  return await Order.create(cleanData(rawOrderData));
}

export async function getAllOrders(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(),
  ]);

  return {
    data: orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getOrderById(id: string) {
  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);
  return order;
}

export async function getOrderBySessionId(sessionId: string) {
  const order = await Order.findOne({ stripeSessionId: sessionId });
  if (!order) throw new AppError("Order not found", 404);
  return order;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  pending_payment: [],
};

export async function updateOrderStatus(id: string, status: "processing" | "shipped" | "delivered" | "cancelled") {
  const order = await Order.findById(id);
  if (!order) throw new AppError("Order not found", 404);

  if (order.paymentStatus !== "paid") {
    throw new AppError("Cannot update status on an unpaid order", 400);
  }

  const allowed = VALID_TRANSITIONS[order.orderStatus] ?? [];
  if (!allowed.includes(status)) {
    throw new AppError(
      `Invalid transition: "${order.orderStatus}" → "${status}". Allowed: ${allowed.length ? allowed.join(", ") : "none (terminal state)"}`,
      400,
    );
  }

  order.orderStatus = status;
  await order.save();
  return order;
}

// Returns all paid orders for a specific customer email (admin order history view)
export async function getOrdersByEmail(email: string) {
  return await Order.find({ email: email.toLowerCase().trim(), paymentStatus: "paid" }).sort({ createdAt: -1 });
}

// Returns all unpaid orders (pending + failed) — used for admin call list
export async function getUnpaidOrders() {
  return await Order.find({ paymentStatus: { $in: ["pending", "failed"] } })
    .sort({ createdAt: -1 })
    .select("email shippingAddress.firstName shippingAddress.lastName shippingAddress.phone items totalAmount paymentStatus orderStatus checkoutUrl createdAt");
}
