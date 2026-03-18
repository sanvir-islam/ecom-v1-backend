import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { emailQueue } from "../config/queue.js";
import { Order } from "../modules/order/order.model.js";
import { Product } from "../modules/product/product.model.js";
import { getAbandonedCartTemplate } from "../templates/abandoned-cart.template.js";
import { env } from "../config/env.js";

interface ReminderJobData {
  orderId: string;
  email: string;
  firstName: string;
}

export const reminderWorker = new Worker<ReminderJobData>(
  "reminder-queue",
  async (job: Job<ReminderJobData>) => {
    const { orderId, email, firstName } = job.data;

    const order = await Order.findById(orderId);

    // Order was paid, deleted by TTL, or already failed — nothing to do
    if (!order || order.paymentStatus !== "pending") {
      console.log(`ℹ️ Reminder skipped for order ${orderId} — already resolved or deleted.`);
      return;
    }

    // Order is still unpaid after 2.5 hours — send the recovery email
    if (!order.checkoutUrl) {
      console.warn(`⚠️ No checkout URL stored for order ${orderId} — cannot send abandoned cart email.`);
      return;
    }

    // Stock check — don't send reminder if items are now out of stock
    for (const item of order.items) {
      const product = await Product.findOne({ _id: item.productId, "variants._id": item.variantId });
      const variant = product?.variants.find((v) => v._id?.toString() === item.variantId.toString());
      if (!variant || variant.stock < item.quantity) {
        console.log(`⚠️ Reminder skipped for order ${orderId} — ${item.name} (${item.sizeLabel}) out of stock`);
        return;
      }
    }

    const resumeUrl = `${env.API_URL}/api/order/${orderId}/resume`;
    const html = getAbandonedCartTemplate(firstName, order.items, order.totalAmount, resumeUrl, order.shippingCost ?? 0);

    await emailQueue.add("send-abandoned-cart", {
      type: "ABANDONED_CART",
      to: email,
      subject: "You left something behind — The California Pickle",
      html,
    });

    console.log(`✉️ Abandoned cart email queued for ${email} (order ${orderId})`);
  },
  {
    connection: redisConnection,
  },
);

reminderWorker.on("completed", (job) => {
  console.log(`✅ Reminder job ${job.id} completed.`);
});

reminderWorker.on("failed", (job, err) => {
  console.error(`❌ Reminder job ${job?.id} failed. Error:`, err.message);
});

reminderWorker.on("error", (err) => {
  console.error("🚨 BullMQ Reminder Worker Error:", err);
});
