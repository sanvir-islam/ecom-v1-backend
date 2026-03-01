import { z } from "zod";

export const registerSchema = z.object({
  email: z.email({ error: "Invalid email format" }),
  password: z.string().min(6, { error: "Password must be at least 6 characters" }),
  name: z.string().trim().min(2).optional(),
});

export const loginSchema = z.object({
  email: z.email({ error: "Invalid email format" }),
  password: z.string().min(1, { error: "Password is required" }),
});

export const forgotPasswordSchema = z.object({
  email: z.email({ message: "Invalid email format" }).toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Reset token is required" }),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

// Create TypeScript types directly from Zod schemas for the Service layer
export type RegisterDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;
