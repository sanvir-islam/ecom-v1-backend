import { Settings } from "./settings.model.js";
import type { UpdateSettingsDTO } from "./settings.schema.js";

// Singleton — always one document. Created with defaults on first access.
export async function getSettings() {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
}

export async function updateSettings(data: UpdateSettingsDTO) {
  const settings = await Settings.findOneAndUpdate({}, { $set: data }, { new: true, upsert: true });
  return settings;
}
