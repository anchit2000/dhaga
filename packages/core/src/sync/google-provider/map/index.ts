/** Google People ⇄ SyncableContact. Split by direction; import paths unchanged. */
export { personToSyncable } from "./from-person";
export {
  PERSON_FIELD_BY_SYNC_FIELD,
  READ_PERSON_FIELDS,
  syncableToPerson,
  updateMaskFor,
} from "./to-person";
