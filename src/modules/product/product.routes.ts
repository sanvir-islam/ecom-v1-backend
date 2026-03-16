import { Router } from "express";
import {
  getAllProductsHandler,
  createProductHandler,
  updateProductHandler,
  activateProductHandler,
  getStorefrontProductHandler,
  uploadImageHandler,
  uploadImagesHandler,
  deleteProductHandler,
  getArchivedProductsHandler,
  restoreProductHandler,
} from "./product.controller.js";

import { requireAuth } from "../../middleware/requireAuth.js";
import upload from "../../middleware/upload.middleware.js";

const router = Router();

// ==========================================
// Public Routes (Storefront)
// ==========================================
router.get("/storefront", getStorefrontProductHandler);

// ==========================================
// Admin Routes (Dashboard)
// ==========================================
// Note: /archived must come before /:id so Express doesn't think "archived" is a product ID!
router.get("/archived", requireAuth, getArchivedProductsHandler);
router.get("/all", requireAuth, getAllProductsHandler);

router.post("/", requireAuth, createProductHandler);
router.put("/:id", requireAuth, updateProductHandler);
router.delete("/:id", requireAuth, deleteProductHandler); // soft delete

router.put("/:id/activate", requireAuth, activateProductHandler);
router.put("/:id/restore", requireAuth, restoreProductHandler);

// Admin File Upload Routes
router.post("/upload-image", requireAuth, upload.single("image"), uploadImageHandler);
router.post("/upload-images", requireAuth, upload.array("images", 7), uploadImagesHandler);

export default router;
