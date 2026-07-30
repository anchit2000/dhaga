// Split per the 150-line rule; import paths unchanged (@/lib/repo/notes).
export {
  addNote,
  clearNoteDerivations,
  deleteNote,
  getNote,
  listNotes,
  replaceNoteBody,
  type NoteKind,
} from "./notes";
export {
  deleteFact,
  listFacts,
  updateFactText,
  verifyFact,
  type FactWithReceipt,
} from "./facts";
export {
  listOpenFollowUps,
  setFollowUpStatus,
  updateFollowUp,
} from "./follow-ups";
