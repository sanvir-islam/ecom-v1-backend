import type { Request, Response } from "express";
import * as SettingsService from "./settings.service.js";
import { updateSettingsSchema } from "./settings.schema.js";

export async function getSettingsHandler(req: Request, res: Response) {
  try {
    const settings = await SettingsService.getSettings();
    return res.status(200).json(settings);
  } catch (error) {
    console.error("Get Settings Error:", error);
    return res.status(500).json({ message: "Failed to fetch settings" });
  }
}

export async function updateSettingsHandler(req: Request, res: Response) {
  try {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

    const settings = await SettingsService.updateSettings(parsed.data);
    return res.status(200).json({ message: "Settings updated successfully", settings });
  } catch (error) {
    console.error("Update Settings Error:", error);
    return res.status(500).json({ message: "Failed to update settings" });
  }
}
