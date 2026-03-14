import { Router } from "express";
import express from "express";
import { getShippingRatesHandler, shippoWebhookHandler } from "./shipping.controller.js";

const router = Router();

// Public — called from the checkout form before payment
router.post("/rates", getShippingRatesHandler);

// Shippo tracking webhook — raw body required for signature verification
router.post("/webhook/shippo", express.raw({ type: "application/json" }), shippoWebhookHandler);

export default router;
