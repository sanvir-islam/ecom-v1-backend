import { Schema, model, Document, Types } from "mongoose";

export interface IVariantImage {
  url: string;
  publicId: string;
}

export interface IVariant {
  _id?: Types.ObjectId;
  sizeLabel: string;
  subtitle?: string;
  price: number;
  images: IVariantImage[];
  stock: number;
  stockStatus: "IN_STOCK" | "OUT_OF_STOCK" | "LOW_STOCK" | "UPCOMING";
  badge?: string;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  flavor?: string;
  description: string;
  performanceMetrics: string[];
  isActive: boolean;
  isDeleted: boolean;
  variants: IVariant[];
  createdAt: Date;
  updatedAt: Date;
}

const variantImageSchema = new Schema<IVariantImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const variantSchema = new Schema<IVariant>({
  sizeLabel: { type: String, required: true },
  subtitle: { type: String },
  price: { type: Number, required: true },
  images: { type: [variantImageSchema], required: true },
  stock: { type: Number, default: 0 },
  stockStatus: {
    type: String,
    enum: ["IN_STOCK", "OUT_OF_STOCK", "LOW_STOCK", "UPCOMING"],
    default: "UPCOMING",
  },
  badge: { type: String },
});

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    flavor: { type: String },
    description: { type: String, required: true },
    performanceMetrics: { type: [String], default: [] },
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    variants: { type: [variantSchema], required: true },
  },
  { timestamps: true },
);

export const Product = model<IProduct>("Product", productSchema);
