import { Schema, model, Document } from "mongoose";

// 1. DEFINE THE TYPESCRIPT INTERFACE
export interface IUser extends Document {
  email: string;
  password: string;
  role: "user" | "admin";
  name?: string | undefined;
  isEmailVerified: boolean;
  tokenVersion: number;
  resetPasswordToken?: string | undefined;
  resetPasswordExpires?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

// 2. PASS THE INTERFACE INTO THE SCHEMA <IUser>
const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    name: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    resetPasswordToken: { type: String, default: undefined },
    resetPasswordExpires: { type: Date, default: undefined },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret: any) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.__v; // Hides the internal Mongoose versioning key
        return ret;
      },
    },
    toObject: {
      transform: function (doc, ret: any) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// 3. PASS THE INTERFACE INTO THE MODEL
export const User = model<IUser>("User", userSchema);
