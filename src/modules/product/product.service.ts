import mongoose from "mongoose";
import { deleteFromCloudinary } from "../../lib/cludinary.js";
import { Product } from "./product.model.js";
import type { CreateProductDTO, UpdateProductDTO } from "./product.schema.js";
import { AppError } from "../../middleware/errorHandler.js";

const cleanData = <T>(data: T): any => JSON.parse(JSON.stringify(data));

export async function getStorefrontProduct() {
  const product = await Product.findOne({ isActive: true, isDeleted: false });
  if (!product) throw new AppError("Storefront is currently in 'Coming Soon' mode (no active product).", 404);
  return product;
}

export async function getAllProducts() {
  return await Product.find({ isDeleted: false }).sort({ createdAt: -1 });
}

export async function getArchivedProducts() {
  return await Product.find({ isDeleted: true }).sort({ createdAt: -1 });
}

// Products are always created as inactive (upcoming) — use activateProduct() to go live
export async function createProduct(data: CreateProductDTO) {
  const cleanedData = cleanData(data);
  cleanedData.isActive = false;

  try {
    const createdProducts = await Product.create([cleanedData]);
    return createdProducts[0];
  } catch (error) {
    throw error;
  }
}

// Dedicated activate toggle — only one product active at a time
export async function activateProduct(id: string) {
  const product = await Product.findById(id);
  if (!product || product.isDeleted) throw new Error("NOT_FOUND");
  if (product.isActive) throw new Error("ALREADY_ACTIVE");

  const allUpcoming = product.variants.every((v) => v.stockStatus === "UPCOMING");
  if (allUpcoming) throw new Error("ACTIVE_UPCOMING_CONFLICT");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await Product.updateMany({ _id: { $ne: id }, isDeleted: false }, { isActive: false }, { session });
    product.isActive = true;
    await product.save({ session });
    await session.commitTransaction();
    return product;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function updateProduct(id: string, data: UpdateProductDTO) {
  const cleanedData = cleanData(data);

  const oldProduct = await Product.findById(id);
  if (!oldProduct || oldProduct.isDeleted) throw new Error("NOT_FOUND");

  // If updating variants of an active product, cannot make all of them UPCOMING
  if (oldProduct.isActive && cleanedData.variants) {
    const allUpcoming = cleanedData.variants.every((v: any) => v.stockStatus === "UPCOMING");
    if (allUpcoming) throw new Error("ACTIVE_UPCOMING_CONFLICT");
  }

  // Collect old Cloudinary publicIds that are no longer in the updated variants
  let imagesToDelete: string[] = [];
  if (cleanedData.variants) {
    const oldPublicIds = oldProduct.variants.flatMap((v) => v.images.map((img) => img.publicId)).filter(Boolean);
    const newPublicIds = cleanedData.variants
      .flatMap((v: any) => (v.images || []).map((img: any) => img.publicId))
      .filter(Boolean);
    imagesToDelete = oldPublicIds.filter((oldId) => !newPublicIds.includes(oldId));
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatedProduct = await Product.findByIdAndUpdate(id, cleanedData, { new: true, session });
    await session.commitTransaction();

    imagesToDelete.forEach((publicId) => {
      deleteFromCloudinary(publicId).catch(console.error);
    });

    return updatedProduct;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function deleteProduct(id: string) {
  const totalActive = await Product.countDocuments({ isDeleted: false });
  if (totalActive <= 1) throw new Error("CANNOT_DELETE_LAST");

  const product = await Product.findById(id);
  if (!product || product.isDeleted) throw new Error("NOT_FOUND");
  if (product.isActive) throw new Error("CANNOT_DELETE_ACTIVE");

  product.isDeleted = true;
  await product.save();
  return true;
}

export async function restoreProduct(id: string) {
  const product = await Product.findById(id);
  if (!product) throw new Error("NOT_FOUND");
  if (!product.isDeleted) throw new Error("ALREADY_RESTORED");

  product.isDeleted = false;
  await product.save();
  return product;
}
