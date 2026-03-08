import { Router } from "express";
import { getShippingRatesHandler } from "./shipping.controller.js";

const router = Router();

// Public — called from the checkout form before payment
router.post("/rates", getShippingRatesHandler);

export default router;
