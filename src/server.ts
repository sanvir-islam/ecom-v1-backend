// GLOBAL CRASH NETS (Must be at the very top!)
process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

process.on("unhandledRejection", (err: any) => {
  console.error("🔥 UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRoutes from "./modules/auth/auth.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import productRoutes from "./modules/product/product.routes.js";
import orderRoutes from "./modules/order/order.routes.js";
import paymentRoutes from "./modules/payment/payment.routes.js";
import settingsRoutes from "./modules/settings/settings.routes.js";
import shippingRoutes from "./modules/shipping/shipping.routes.js";
// redis and email import
import "./config/redis.js";
import "./jobs/email.worker.js";
import "./jobs/reminder.worker.js";
import { env } from "./config/env.js";
import { globalLimiter } from "./middleware/rateLimiter.js";

const app = express();

// 1. Trust Proxy (Crucial for Rate Limiting behind Nginx/VPS)
app.set("trust proxy", 1);

// 2. The CORS Fix (Allows cookies cross-origin)
app.use(
  cors({
    origin: "*", // env.FRONTEND_URL
    credentials: true, // This is the magic line that allows cookies to pass!
  }),
);
app.use("/api/payments", paymentRoutes);

// 3. Body & Cookie Parsers (The Cookie Fix)
app.use(express.json()); // Parses req.body
app.use(cookieParser()); // Parses req.cookies!

//rate limiter
app.use(globalLimiter);

// 4. Register Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/shipping", shippingRoutes);
// 5. Start Server
const PORT = env.PORT || 5000;

// Connect to DB first, then start listening
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
