import type { Request, Response } from "express";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "./auth.schema.js";
import * as AuthService from "./auth.service.js";
import { User } from "../user/user.model.js";

const isProd = process.env.NODE_ENV === "production";

// Reusable cookie setter
const setCookies = (res: Response, access: string, refresh?: string) => {
  res.cookie("accessToken", access, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
  });
  if (refresh) {
    res.cookie("refreshToken", refresh, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
};

export async function registerHandler(req: Request, res: Response) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

    const { user, accessToken, refreshToken } = await AuthService.registerUser(parsed.data);
    setCookies(res, accessToken, refreshToken);

    return res.status(201).json({ message: "Registered successfully", user: { id: user.id, email: user.email } });
  } catch (error: any) {
    if (error.message === "Email already in use") return res.status(409).json({ message: error.message });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

    const { user, accessToken, refreshToken } = await AuthService.loginUser(parsed.data);
    setCookies(res, accessToken, refreshToken);

    return res.status(200).json({ message: "Login successful", user: { id: user.id, email: user.email } });
  } catch (error: any) {
    if (error.message === "Invalid credentials") return res.status(401).json({ message: error.message });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function refreshHandler(req: Request, res: Response) {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

    const { accessToken } = await AuthService.refreshSession(refreshToken);
    setCookies(res, accessToken); // Only update the access token

    return res.status(200).json({ message: "Session refreshed" });
  } catch (error) {
    // If refresh token is invalid/expired, clear cookies so the frontend knows to kick them to the login screen
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(401).json({ message: "Session expired" });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  try {
    // We need the user ID from the request to update their token version.
    // To do this, you MUST add `requireAuth` middleware to the /logout route!
    const userId = (req as any).user.id;

    // This single line instantly kills all stolen tokens
    await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Logged out successfully across all devices" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error during logout" });
  }
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

    await AuthService.forgotPassword(parsed.data);

    // Always send the exact same success message so hackers can't guess valid emails
    return res.status(200).json({ message: "If an account exists, a reset link has been sent to that email." });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function resetPasswordHandler(req: Request, res: Response) {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

    await AuthService.resetPassword(parsed.data);

    return res.status(200).json({ message: "Password reset successfully. You can now log in." });
  } catch (error: any) {
    if (error.message === "Invalid or expired reset token") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}
