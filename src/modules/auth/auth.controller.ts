import type { Request, Response } from "express";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema } from "./auth.schema.js";
import * as AuthService from "./auth.service.js";
import { cookieOptions } from "../../lib/jwt.js";

export async function loginHandler(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.format() });
    }

    // Call loginAdmin instead of loginUser
    const { admin, accessToken, refreshToken } = await AuthService.loginAdmin(parsed.data);

    res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.status(200).json({ message: "Admin logged in successfully", admin });
  } catch (error: any) {
    if (error.message === "Invalid credentials") {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function refreshHandler(req: Request, res: Response) {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(401).json({ message: "No refresh token" });

    const { accessToken } = await AuthService.refreshSession(refreshToken);
    res.cookie("accessToken", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });

    return res.status(200).json({ message: "Session refreshed" });
  } catch (error) {
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    return res.status(401).json({ message: "Session expired" });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  try {
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error during logout" });
  }
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

    await AuthService.forgotPassword(parsed.data);

    return res.status(200).json({ message: "If an account exists, a reset link has been sent." });
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
