import { Router } from "express";
import {
  createOrderHandler,
  getAllOrdersHandler,
  getOrderBySessionHandler,
  updateOrderStatusHandler,
  getUnpaidOrdersHandler,
  sendManualReminderHandler,
} from "./order.controller.js";
import { requireAuth } from "../../middleware/requireAuth.js";

const router = Router();

// ==========================================
// Public Routes (Storefront Checkout)
// ==========================================
router.post("/checkout", createOrderHandler);
router.get("/session/:sessionId", getOrderBySessionHandler);

// ==========================================
// Admin Routes (Dashboard)
// ==========================================
router.get("/all", requireAuth, getAllOrdersHandler);
router.get("/unpaid", requireAuth, getUnpaidOrdersHandler);
router.post("/:id/remind", requireAuth, sendManualReminderHandler);
router.put("/:id/status", requireAuth, updateOrderStatusHandler);

export default router;
