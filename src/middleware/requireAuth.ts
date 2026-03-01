import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Define the exact shape of your JWT payload
interface JwtPayload {
  sub: string;
  role: string;
  tokenVersion: number;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.accessToken;
    if (!token) return res.status(401).json({ message: "Authentication required" });

    // Cast it to our strict interface instead of 'any'
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as JwtPayload;

    (req as any).user = {
      id: decoded.sub,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
