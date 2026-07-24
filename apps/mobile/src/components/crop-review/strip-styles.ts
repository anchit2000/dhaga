import { StyleSheet } from "react-native";

import { COLORS } from "@/utils/constants";

/** Thumbnail edge (dp) for the multi-image review strip. */
const THUMB_SIZE = 132;

/** Styles for CropReviewStrip — split out to keep the component under the file-length limit. */
export const stripStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  header: { paddingHorizontal: 20, paddingTop: 20, gap: 6 },
  title: { color: COLORS.paper, fontSize: 20, fontWeight: "700" },
  subtitle: { color: COLORS.fog, fontSize: 14, lineHeight: 20 },
  stripArea: { flex: 1, justifyContent: "center" },
  strip: { paddingHorizontal: 20, gap: 12, alignItems: "center" },
  thumbWrap: { width: THUMB_SIZE, height: THUMB_SIZE },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.seam,
  },
  thumbImage: { width: "100%", height: "100%" },
  cropBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(13, 11, 9, 0.7)",
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.panel2,
    borderWidth: 1,
    borderColor: COLORS.seam,
  },
  footer: { flexDirection: "row", gap: 12, padding: 20 },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.seam,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelLabel: { color: COLORS.paper, fontSize: 16, fontWeight: "600" },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: COLORS.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmLabel: { color: COLORS.ink, fontSize: 16, fontWeight: "600" },
});
