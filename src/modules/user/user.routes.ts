import { Router } from "express";
import { getMeHandler } from "./user.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = Router();

// Protect this route with middleware!
router.get("/me", requireAuth, getMeHandler);

export default router;