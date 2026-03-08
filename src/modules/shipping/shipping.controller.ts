import type { Request, Response } from "express";
import { getShippingRates } from "./shipping.service.js";
import { z } from "zod";

const ratesRequestSchema = z.object({
  toAddress: z.object({
    name: z.string().min(1),
    street: z.string().min(3),
    city: z.string().min(2),
    state: z.string().length(2).toUpperCase(),
    zip: z.string().regex(/^\d{5}$/),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().length(24),
        variantId: z.string().length(24),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1),
});

export async function getShippingRatesHandler(req: Request, res: Response) {
  try {
    const parsed = ratesRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

    const rates = await getShippingRates(parsed.data.toAddress, parsed.data.items);

    if (rates.length === 0) {
      return res.status(200).json({ rates: [], message: "No carrier rates available for this address" });
    }

    return res.status(200).json({ rates });
  } catch (error: any) {
    console.error("Get Shipping Rates Error:", error.message);
    return res.status(500).json({ message: "Failed to get shipping rates. Please try again." });
  }
}
