import { Worker, Job } from "bullmq";
import nodemailer from "nodemailer";
import { env } from "../config/env.js"; // Make sure ZEPTOMAIL_API_KEY is in here
import { redisConnection } from "../config/redis.js";

// 1. Create the Nodemailer transporter for ZeptoMail SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.zeptomail.com",
  port: 587,
  auth: {
    user: "emailapikey", // This is always "emailapikey" for ZeptoMail
    pass: env.ZEPTOMAIL_API_KEY,
  },
});

// 2. Define exactly what data the job expects
interface EmailJobData {
  type: "PASSWORD_RESET" | "WELCOME" | "ORDER_CONFIRMATION" | "ABANDONED_CART";
  to: string;
  subject: string;
  html: string;
}

// 3. The Worker Logic
export const emailWorker = new Worker<EmailJobData>(
  "email-queue",
  async (job: Job) => {
    console.log(`⏳ Worker picked up job: Sending ${job.data.type} to ${job.data.to}`);

    // transporter.sendMail is promise-based.
    // If it fails, it throws an error which BullMQ catches automatically!
    const info = await transporter.sendMail({
      from: '"The California Pickle" <noreply@thecaliforniapickle.com>', // Matches your verified Zepto domain
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
    });

    console.log(`✅ Email sent successfully (Message ID: ${info.messageId})`);
  },
  {
    connection: redisConnection,
    limiter: { max: 9, duration: 1000 },
  },
);

// 👇 Event listeners for debugging and logging
emailWorker.on("completed", (job) => {
  console.log(`🎉 Job ${job.id} completed successfully!`);
});

emailWorker.on("failed", (job, err) => {
  // This will catch any Nodemailer/SMTP errors (like bad API keys)
  console.error(`❌ Job ${job?.id} failed for ${job?.data.to}. Error:`, err.message);
});

emailWorker.on("error", (err) => {
  // This catches underlying Redis connection errors
  console.error("🚨 BullMQ Worker Error:", err);
});
