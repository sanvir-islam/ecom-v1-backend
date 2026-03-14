import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Database
  MONGODB_URI: z.string().min(1, { message: "MONGODB_URI is required — get it from MongoDB Atlas > Connect > Drivers" }),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(32, { message: "JWT_ACCESS_SECRET must be at least 32 characters — generate with: openssl rand -hex 32" }),
  JWT_REFRESH_SECRET: z.string().min(32, { message: "JWT_REFRESH_SECRET must be at least 32 characters — generate with: openssl rand -hex 32" }),

  // Email
  ZEPTOMAIL_API_KEY: z.string().min(1, { message: "ZEPTOMAIL_API_KEY is required — get it from ZeptoMail > Mail Agents > API" }),

  // Queue
  REDIS_URI: z.string().min(1, { message: "REDIS_URI is required — get it from Upstash > Redis > Connect > Node.js (ioredis)" }),

  // Images
  CLOUDINARY_CLOUD_NAME: z.string().min(1, { message: "CLOUDINARY_CLOUD_NAME is required — get it from Cloudinary Dashboard > Settings" }),
  CLOUDINARY_API_KEY: z.string().min(1, { message: "CLOUDINARY_API_KEY is required — get it from Cloudinary Dashboard > Settings > API Keys" }),
  CLOUDINARY_API_SECRET: z.string().min(1, { message: "CLOUDINARY_API_SECRET is required — get it from Cloudinary Dashboard > Settings > API Keys" }),

  // Payments
  STRIPE_SECRET_KEY: z.string().min(1, { message: "STRIPE_SECRET_KEY is required — get it from Stripe Dashboard > Developers > API Keys" }),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, { message: "STRIPE_WEBHOOK_SECRET is required — get it from Stripe Dashboard > Developers > Webhooks > Signing Secret" }),

  // Shipping
  SHIPPO_API_KEY: z.string().min(1, { message: "SHIPPO_API_KEY is required — get it from Shippo Dashboard > Settings > API" }),
  SHIPPO_WEBHOOK_SECRET: z.string().optional(),

  // App
  FRONTEND_URL: z.url({ message: "FRONTEND_URL must be a valid URL — e.g. https://thecaliforniapickle.com (no trailing slash)" }),
  PORT: z.string().default("5000"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("\n❌ Server startup failed — missing or invalid environment variables:\n");
  parsedEnv.error.issues.forEach((issue) => {
    console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
  });
  console.error("\nFix the above variables in your .env file and restart the server.\n");
  process.exit(1);
}

export const env = parsedEnv.data;
