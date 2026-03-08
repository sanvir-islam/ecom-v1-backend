import { z } from "zod";

const stockStatusEnum = z.enum(["IN_STOCK", "OUT_OF_STOCK", "LOW_STOCK", "UPCOMING"] as const, {
  message: "Status must be IN_STOCK, OUT_OF_STOCK, LOW_STOCK, or UPCOMING",
});

const variantImageSchema = z.object({
  url: z.url({ message: "Must be a valid image URL" }),
  publicId: z.string().min(1, { message: "Cloudinary Public ID is required" }),
});

const variantSchema = z.object({
  _id: z.string().optional(),
  sizeLabel: z.string().min(1, { message: "Size label is required (e.g., 'Small')" }),
  subtitle: z.string().optional(),
  price: z.number().positive({ message: "Price must be greater than zero" }),
  images: z
    .array(variantImageSchema)
    .min(1, { message: "Each variant must have at least 1 image" })
    .max(5, { message: "Each variant can have a maximum of 5 images" }),
  stock: z.number().int().nonnegative().default(0),
  stockStatus: stockStatusEnum.default("UPCOMING"),
  badge: z.string().optional(),
});

// isActive is intentionally excluded — products are always created as inactive (upcoming)
// Use PUT /:id/activate to make a product live
export const createProductSchema = z.object({
  name: z.string().min(2, { message: "Product name is required" }),
  slug: z
    .string()
    .min(2, { message: "Slug is required" })
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug can only contain letters, numbers, and hyphens",
    }),
  flavor: z.string().optional(),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  performanceMetrics: z.array(z.string()).default([]),
  variants: z.array(variantSchema).length(3, { message: "A product must have exactly 3 size variants" }),
});

export const updateProductSchema = createProductSchema.partial();

export const productIdParamSchema = z.object({
  id: z.string().length(24, { message: "Product ID must be a valid 24-character MongoDB string" }),
});

export type CreateProductDTO = z.infer<typeof createProductSchema>;
export type UpdateProductDTO = z.infer<typeof updateProductSchema>;
