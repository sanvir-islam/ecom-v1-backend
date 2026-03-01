import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js"; // Assuming you put our DB code here
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";

const app = express();

// 1. Trust Proxy (Crucial for Rate Limiting behind Nginx/VPS)
app.set("trust proxy", 1);

// 2. The CORS Fix (Allows cookies cross-origin)
app.use(
  cors({
    // In production, this MUST be your exact frontend URL (e.g., "https://my-store.com")
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true, // This is the magic line that allows cookies to pass!
  }),
);

// 3. Body & Cookie Parsers (The Cookie Fix)
app.use(express.json()); // Parses req.body
app.use(cookieParser()); // Parses req.cookies!

// 4. Register Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// 5. Start Server
const PORT = process.env.PORT || 5000;

// Connect to DB first, then start listening
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
