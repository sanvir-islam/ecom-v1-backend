import type { Request, Response } from "express";
import * as UserService from "./user.service.js";

export async function getMeHandler(req: Request, res: Response) {
  try {
    // req.user is safely injected by the requireAuth middleware below
    const userId = (req as any).user.id;
    const user = await UserService.getUserById(userId);

    return res.status(200).json({ user });
  } catch (error: any) {
    return res.status(404).json({ message: "User profile not found" });
  }
}
