import { z } from "zod";

export const shipFromSchema = z.object({
  name: z.string().min(1, { message: "Sender name is required" }),
  company: z.string().min(1, { message: "Company name is required" }),
  street1: z.string().min(3, { message: "Street address is required" }),
  city: z.string().min(2, { message: "City is required" }),
  state: z.string().length(2, { message: "State must be a 2-letter code (e.g., CA)" }).toUpperCase(),
  zip: z.string().regex(/^\d{5}$/, { message: "Must be a valid 5-digit ZIP code" }),
  country: z.string().length(2).default("US"),
  phone: z.string().regex(/^\d{10}$/, { message: "Must be a valid 10-digit phone number" }),
  email: z.email({ message: "Must be a valid email" }),
});

export const updateSettingsSchema = z.object({
  shipFrom: shipFromSchema,
});

export type UpdateSettingsDTO = z.infer<typeof updateSettingsSchema>;
