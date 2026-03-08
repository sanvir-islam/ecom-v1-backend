import { Schema, model, Document } from "mongoose";

export interface IShipFrom {
  name: string;
  company: string;
  street1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
}

export interface ISettings extends Document {
  shipFrom: IShipFrom;
}

const shipFromSchema = new Schema<IShipFrom>(
  {
    name: { type: String, default: "The California Pickle" },
    company: { type: String, default: "The California Pickle" },
    street1: { type: String, default: "123 Main Street" },
    city: { type: String, default: "Los Angeles" },
    state: { type: String, default: "CA" },
    zip: { type: String, default: "90001" },
    country: { type: String, default: "US" },
    phone: { type: String, default: "2135550000" },
    email: { type: String, default: "shipping@thecaliforniapickle.com" },
  },
  { _id: false },
);

const settingsSchema = new Schema<ISettings>(
  {
    shipFrom: { type: shipFromSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const Settings = model<ISettings>("Settings", settingsSchema);
