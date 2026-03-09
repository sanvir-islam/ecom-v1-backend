import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { ForgotPasswordDTO, LoginDTO, ResetPasswordDTO } from "./auth.schema.js";
import { Admin } from "../admin/admin.model.js"; // Updated import!
import { getPasswordResetTemplate } from "../../templates/auth.template.js";
import { emailQueue } from "../../config/queue.js";
import { env } from "../../config/env.js";

// Helper function to generate tokens
const generateTokens = (admin: any) => {
  const accessToken = jwt.sign(
    { sub: admin.id, tokenVersion: admin.tokenVersion, role: "admin" }, // Force admin role in token
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    { sub: admin.id, tokenVersion: admin.tokenVersion },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: "7d" },
  );

  return { accessToken, refreshToken };
};

export async function loginAdmin(data: LoginDTO) {
  const email = data.email.toLowerCase().trim();

  const admin = await Admin.findOne({ email });
  if (!admin) throw new Error("Invalid credentials");

  const isMatch = await bcrypt.compare(data.password, admin.password);
  if (!isMatch) throw new Error("Invalid credentials");

  return { admin, ...generateTokens(admin) };
}

export async function refreshSession(token: string) {
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as any;

  const admin = await Admin.findById(decoded.sub);
  if (!admin) throw new Error("Admin not found");

  if (admin.tokenVersion !== decoded.tokenVersion) {
    throw new Error("Session expired. Please log in again.");
  }

  const accessToken = jwt.sign(
    { sub: admin.id, tokenVersion: admin.tokenVersion, role: "admin" },
    process.env.JWT_ACCESS_SECRET as string,
    { expiresIn: "15m" },
  );

  return { accessToken };
}

export async function forgotPassword(data: ForgotPasswordDTO) {
  const admin = await Admin.findOne({ email: data.email });
  if (!admin) return; // Silently return

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  admin.resetPasswordToken = hashedToken;
  admin.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await admin.save();

  const resetLink = `${env.FRONTEND_URL}/admin/reset-password?token=${resetToken}`;
  const emailHtml = getPasswordResetTemplate(resetLink);

  await emailQueue.add(
    "send-forgot-password",
    {
      type: "PASSWORD_RESET",
      to: admin.email,
      subject: "Reset Your Dashboard Password",
      html: emailHtml,
    },
    { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
  );
}

export async function resetPassword(data: ResetPasswordDTO) {
  const hashedToken = crypto.createHash("sha256").update(data.token).digest("hex");

  const admin = await Admin.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!admin) throw new Error("Invalid or expired reset token");

  admin.password = await bcrypt.hash(data.newPassword, 10);
  admin.resetPasswordToken = undefined;
  admin.resetPasswordExpires = undefined;
  admin.tokenVersion += 1; // Logout old sessions

  await admin.save();
}
