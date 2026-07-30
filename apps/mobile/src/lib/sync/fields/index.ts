/**
 * Pure field mapping between the device address book and SyncableContact.
 * Split by direction so a read change can't silently alter a write:
 * read.ts (device → Dhaga), write.ts (Dhaga → device), dates.ts (the two
 * incompatible month conventions), types.ts (the device record shapes).
 */
export { deviceDateToValue, isBirthdayLabel, toLegacyDate, valueToDeviceDate } from "./dates";
export { detailsToSyncable } from "./read";
export { splitName, syncableToLegacyContact, syncableToPatch } from "./write";
export type {
  DeviceDate,
  DeviceDateEntry,
  DeviceEmailEntry,
  DeviceExtraNameEntry,
  DeviceLabeled,
  DevicePhoneEntry,
  DevicePostalEntry,
  DeviceUrlEntry,
  LegacyCreateContact,
  LegacyDate,
  SyncDetails,
  SyncPatch,
} from "./types";
