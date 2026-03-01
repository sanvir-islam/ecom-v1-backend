import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { ForgotPasswordDTO, LoginDTO, RegisterDTO, ResetPasswordDTO } from "./auth.schema.js";
import { User } from "../user/user.model.js";

// Helper function to generate tokens
const generateTokens = (user: any) => {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    { sub: user.id, tokenVersion: user.tokenVersion },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: "7d" },
  );

  return { accessToken, refreshToken };
};

export async function registerUser(data: RegisterDTO) {
  const email = data.email.toLowerCase().trim();

  const hashedPassword = await bcrypt.hash(data.password, 10); // Lowered to 10 for better concurrency!

  try {
    const user = await User.create({
      email,
      password: hashedPassword,
      ...(data.name ? { name: data.name } : {}),
    });

    return { user, ...generateTokens(user) };
  } catch (error: any) {
    // 11000 is the official MongoDB code for "Duplicate Key"
    if (error.code === 11000) {
      throw new Error("Email already in use");
    }
    throw error;
  }
}

export async function loginUser(data: LoginDTO) {
  const email = data.email.toLowerCase().trim();

  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid credentials");

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) throw new Error("Invalid credentials");

  return { user, ...generateTokens(user) };
}

export async function refreshSession(token: string) {
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as any;

  const user = await User.findById(decoded.sub);
  if (!user) throw new Error("User not found");

  if (user.tokenVersion !== decoded.tokenVersion) {
    throw new Error("Session expired. Please log in again.");
  }

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role, tokenVersion: user.tokenVersion },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: "15m" },
  );

  return { accessToken };
}

export async function forgotPassword(data: ForgotPasswordDTO) {
  const user = await User.findOne({ email: data.email });

  // SECURITY MEASURE: If the user doesn't exist, we silently return.
  // We don't want to tell hackers which emails are registered in our database!
  if (!user) return;

  // 1. Generate a random 32-character hex string for the email link
  const resetToken = crypto.randomBytes(32).toString("hex");

  // 2. Hash that token before saving it to the database (Security standard)
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  // 3. Save the hashed token and set it to expire in 15 minutes
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  // IN PRODUCTION: Here is where you would trigger your email service (Resend, SendGrid, etc.)
  // e.g., sendEmail(user.email, `https://yourdomain.com/reset-password?token=${resetToken}`);
  console.log(`[DEV MODE] Email sent with token: ${resetToken}`);
}

export async function resetPassword(data: ResetPasswordDTO) {
  // 1. Hash the incoming token so we can compare it to the one in the DB
  const hashedToken = crypto.createHash("sha256").update(data.token).digest("hex");

  // 2. Find the user with this token, ensuring it hasn't expired yet ($gt = greater than)
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) throw new Error("Invalid or expired reset token");

  // 3. Hash the new password and update the user
  const hashedPassword = await bcrypt.hash(data.newPassword, 10);
  user.password = hashedPassword;

  // 4. Clean up the database fields
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  // 5. CRITICAL: Increment token version! This instantly logs the user out of all
  // old devices so a hacker can't keep using the account after a password reset.
  user.tokenVersion += 1;

  await user.save();
}
