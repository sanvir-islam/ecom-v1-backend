import { Schema, model, Document, Types } from "mongoose";

export interface IOrderItem {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  name: string;
  sizeLabel: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface IOrder extends Document {
  email: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    street: string;
    aptOrSuite?: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
  };
  items: IOrderItem[];
  totalAmount: number;
  paymentStatus: "pending" | "paid" | "failed";
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  checkoutUrl?: string | null;
  shippingCost: number;
  shippoRateId?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingLabelUrl?: string | null;
  shippingCarrier?: string | null;
  discountCode?: string | null;
  discountAmount: number;
  orderStatus: "pending_payment" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  variantId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  sizeLabel: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  priceAtPurchase: { type: Number, required: true },
});

const orderSchema = new Schema<IOrder>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    shippingAddress: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      street: { type: String, required: true },
      aptOrSuite: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true, uppercase: true },
      zipCode: { type: String, required: true },
      phone: { type: String, required: true },
    },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    stripeSessionId: { type: String, default: null },
    stripePaymentIntentId: { type: String, default: null },
    checkoutUrl: { type: String, default: null },
    shippingCost: { type: Number, default: 0 },
    shippoRateId: { type: String, default: null },
    trackingNumber: { type: String, default: null },
    trackingUrl: { type: String, default: null },
    shippingLabelUrl: { type: String, default: null },
    shippingCarrier: { type: String, default: null },
    discountCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
    orderStatus: {
      type: String,
      enum: ["pending_payment", "processing", "shipped", "delivered", "cancelled"],
      default: "pending_payment",
    },
  },
  { timestamps: true },
);

// 1. Customer lookup — fast per-email order history filtered by payment status
orderSchema.index({ email: 1, paymentStatus: 1 });

// 2. Admin dashboard sort — getAllOrders sorts by createdAt, needs this to avoid full scan
orderSchema.index({ createdAt: -1 });

// 3. Unpaid orders query — getUnpaidOrders filters by paymentStatus + sorts by createdAt
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

// 4. Admin status filtering — future dashboard filter by orderStatus
orderSchema.index({ orderStatus: 1 });

// 5. TTL INDEX — auto-delete pending orders after 3 days (bot/spam protection)
orderSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 3 * 24 * 60 * 60,
    partialFilterExpression: { paymentStatus: "pending" },
  },
);

export const Order = model<IOrder>("Order", orderSchema);
