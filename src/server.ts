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
const allowedOrigins = [
  "https://thecaliforniapickle.com",
  "https://www.thecaliforniapickle.com",
  "http://localhost:3000", // dev
];
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin) and listed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
};
// Explicit OPTIONS preflight handling (fixes multipart/file upload CORS issues)
app.options(/(.*)/, cors(corsOptions));
app.use(cors(corsOptions));
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
// 5. Global error handler — re-applies CORS headers so browser sees real errors not CORS failures
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  const status = err.status || err.statusCode || 500;
  console.error(`[${status}] ${err.message}`);
  res.status(status).json({ message: err.message || "Internal Server Error" });
});

// 6. Start Server
const PORT = env.PORT || 5000;

// Connect to DB first, then start listening
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
