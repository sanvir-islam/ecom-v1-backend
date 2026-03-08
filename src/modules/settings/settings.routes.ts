import { Router } from "express";
import { getSettingsHandler, updateSettingsHandler } from "./settings.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = Router();

router.get("/", requireAuth, getSettingsHandler);
router.put("/", requireAuth, updateSettingsHandler);

export default router;
