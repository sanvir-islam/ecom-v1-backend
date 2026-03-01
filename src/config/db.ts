import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("🔥 FATAL ERROR: MONGODB_URI is missing in environment variables.");
    process.exit(1); // Stop the app immediately if there's no DB string
  }

  try {
    // We await the initial connection to ensure the DB is up before the app starts accepting traffic
    await mongoose.connect(mongoUri, {
      // --- CONNECTION POOLING (Scales from Free to Paid) ---
      maxPoolSize: 50, // 50 pipes is plenty for 2k-3k users, and keeps you safely under the 500 Free Tier limit.
      minPoolSize: 10, // Keeps 10 pipes warm so sudden traffic spikes don't cause cold-start delays.
      
      // --- TIMEOUTS & RESILIENCE ---
      serverSelectionTimeoutMS: 5000, // If the DB is completely down, fail after 5s instead of hanging users forever.
      socketTimeoutMS: 45000, // Close inactive sockets after 45s to free up memory.
      
      // --- NETWORK FIXES ---
      family: 4, // Forces IPv4 to prevent random DNS 'EAI_AGAIN' errors.
    });

    console.log("✅ MongoDB Connected Successfully (Production Pool Active)");
  } catch (error) {
    console.error("❌ MongoDB Connection Error on Startup:", error);
    process.exit(1); 
  }
};

// 👇 NETWORK EVENT LISTENERS (The Auto-Reconnect Safety Net) 👇
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB connection lost! Mongoose will automatically try to reconnect...");
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB network connection completely restored!");
});

mongoose.connection.on("error", (err) => {
  console.error("🔥 MongoDB background network error:", err.message);
});

// 👇 GRACEFUL SHUTDOWN (Prevents Data Corruption on Server Restart) 👇
const gracefulShutdown = async () => {
  console.log("Closing MongoDB connections before server shutdown...");
  await mongoose.connection.close();
  console.log("✅ MongoDB connections closed safely.");
  process.exit(0);
};

// Listen for termination signals from your VPS (like AWS, DigitalOcean, or PM2)
process.on("SIGINT", gracefulShutdown);  // Ctrl+C in terminal
process.on("SIGTERM", gracefulShutdown); // Kill command from process manager