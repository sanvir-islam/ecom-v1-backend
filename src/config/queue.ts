import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";

export const emailQueue = new Queue("email-queue", {
  connection: redisConnection,
});

export const reminderQueue = new Queue("reminder-queue", {
  connection: redisConnection,
});

console.log("📦 Redis Email & Reminder Queues Initialized!");
