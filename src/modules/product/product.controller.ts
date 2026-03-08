import type { Request, Response } from "express";
import * as ProductService from "./product.service.js";
import { createProductSchema, updateProductSchema, productIdParamSchema } from "./product.schema.js";
import { uploadToCloudinary } from "../../lib/cludinary.js";
import { AppError } from "../../middleware/errorHandler.js";

export async function uploadImageHandler(req: Request, res: Response) {
  try {
    if (!req.file) return res.status(400).json({ message: "No image file provided" });
    const result = await uploadToCloudinary(req.file.path, "california-pickle-products");
    return res.status(200).json({ message: "Image uploaded successfully", url: result.url, publicId: result.publicId });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to upload image" });
  }
}

export async function getStorefrontProductHandler(req: Request, res: Response) {
  try {
    const product = await ProductService.getStorefrontProduct();
    return res.status(200).json(product);
  } catch (error: any) {
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ message: "Storefront is currently in 'Coming Soon' mode (no active product)." });
    }
    return res.status(500).json({ message: "Failed to fetch storefront product" });
  }
}

export async function getAllProductsHandler(req: Request, res: Response) {
  try {
    const products = await ProductService.getAllProducts();
    return res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch admin products" });
  }
}

// NEW: Handler to fetch only archived items
export async function getArchivedProductsHandler(req: Request, res: Response) {
  try {
    const products = await ProductService.getArchivedProducts();
    return res.status(200).json(products);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch archived products" });
  }
}

export async function createProductHandler(req: Request, res: Response) {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.issues });

    const product = await ProductService.createProduct(parsed.data);
    return res.status(201).json({ message: "Product created successfully", product });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A product with this slug already exists" });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateProductHandler(req: Request, res: Response) {
  try {
    const paramsParsed = productIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) return res.status(400).json({ errors: paramsParsed.error.issues });

    const bodyParsed = updateProductSchema.safeParse(req.body);
    if (!bodyParsed.success) return res.status(400).json({ errors: bodyParsed.error.issues });

    const updatedProduct = await ProductService.updateProduct(paramsParsed.data.id, bodyParsed.data);
    return res.status(200).json({ message: "Product updated successfully", product: updatedProduct });
  } catch (error: any) {
    if (error.code === 11000) return res.status(409).json({ message: "A product with this slug already exists" });
    if (error.message === "NOT_FOUND") return res.status(404).json({ message: "Product not found" });
    if (error.message === "ACTIVE_UPCOMING_CONFLICT")
      return res.status(400).json({ message: "Cannot set all variants to UPCOMING on an active product." });

    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteProductHandler(req: Request, res: Response) {
  try {
    const paramsParsed = productIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) return res.status(400).json({ errors: paramsParsed.error.issues });

    await ProductService.deleteProduct(paramsParsed.data.id);
    return res.status(200).json({ message: "Product successfully archived" });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") return res.status(404).json({ message: "Product not found" });
    if (error.message === "CANNOT_DELETE_LAST")
      return res.status(400).json({
        message: "Cannot delete the last product. Create a new product first to prevent breaking your storefront.",
      });
    if (error.message === "CANNOT_DELETE_ACTIVE")
      return res.status(400).json({
        message: "Cannot delete the currently active product. Set another product to active before deleting this one.",
      });

    return res.status(500).json({ message: "Internal server error deleting product" });
  }
}

export async function activateProductHandler(req: Request, res: Response) {
  try {
    const paramsParsed = productIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) return res.status(400).json({ errors: paramsParsed.error.issues });

    const product = await ProductService.activateProduct(paramsParsed.data.id);
    return res.status(200).json({ message: "Product is now live on the storefront", product });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") return res.status(404).json({ message: "Product not found" });
    if (error.message === "ALREADY_ACTIVE") return res.status(400).json({ message: "This product is already active" });
    if (error.message === "ACTIVE_UPCOMING_CONFLICT")
      return res.status(400).json({ message: "Cannot activate a product where all variants are UPCOMING" });
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function restoreProductHandler(req: Request, res: Response) {
  try {
    const paramsParsed = productIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) return res.status(400).json({ errors: paramsParsed.error.issues });

    const restoredProduct = await ProductService.restoreProduct(paramsParsed.data.id);
    return res.status(200).json({ message: "Product successfully restored", product: restoredProduct });
  } catch (error: any) {
    if (error.message === "NOT_FOUND") return res.status(404).json({ message: "Product not found" });
    if (error.message === "ALREADY_RESTORED")
      return res.status(400).json({ message: "Product is already active or restored." });

    return res.status(500).json({ message: "Internal server error restoring product" });
  }
}
