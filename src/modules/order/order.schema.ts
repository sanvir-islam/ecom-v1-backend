import { z } from "zod";

export const createOrderSchema = z.object({
  email: z.email({ message: "A valid email is required for the receipt" }).toLowerCase(),

  shippingAddress: z.object({
    firstName: z.string().min(2, { message: "First name is required" }),
    lastName: z.string().min(2, { message: "Last name is required" }),
    street: z.string().min(5, { message: "Street address is required" }),
    aptOrSuite: z.string().optional(),
    city: z.string().min(2, { message: "City is required" }),
    state: z.string().length(2, { message: "State must be a 2-letter code (e.g., CA)" }).toUpperCase(),
    zipCode: z.string().regex(/^\d{5}$/, { message: "Must be a valid 5-digit US ZIP Code" }),
    phone: z.string().regex(/^\d{10}$/, { message: "Must be a valid 10-digit US phone number (no spaces or dashes)" }),
  }),

  items: z
    .array(
      z.object({
        productId: z.string().length(24, { message: "Invalid product ID format" }),
        variantId: z.string().length(24, { message: "Invalid variant ID format" }),
        quantity: z.number().int().min(1, { message: "Quantity must be at least 1" }).max(20, { message: "Max 20 units per item" }),
      }),
    )
    .min(1, { message: "Order must contain at least one item" }),
  shippoRateId: z.string().min(1, { message: "A shipping rate must be selected" }),
  shippingCost: z.number().nonnegative({ message: "Shipping cost must be 0 or greater" }),
});

export type CreateOrderDTO = z.infer<typeof createOrderSchema>;

export const orderIdParamSchema = z.object({
  id: z.string().length(24, { message: "Invalid MongoDB ID format" }),
});

export const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(["processing", "shipped", "delivered", "cancelled"], {
    message: "Status must be processing, shipped, delivered, or cancelled",
  }),
});
