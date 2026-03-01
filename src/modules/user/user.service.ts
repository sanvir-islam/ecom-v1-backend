import { User } from "./user.model.js";

export async function getUserById(userId: string) {
  const user = await User.findById(userId).select("-password -resetPasswordToken");
  if (!user) throw new Error("User not found");
  return user;
}