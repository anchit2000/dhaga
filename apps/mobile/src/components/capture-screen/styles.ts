import { StyleSheet } from "react-native";

import { COLORS } from "@/utils/constants";

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  overlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, gap: 16 },
  retry: {
    borderColor: COLORS.amber,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  retryLabel: { color: COLORS.amber, fontSize: 15, fontWeight: "600" },
});
