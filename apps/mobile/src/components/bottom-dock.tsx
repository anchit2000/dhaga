import { BlurView } from "expo-blur";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/utils/constants";

import type { ReactNode } from "react";

export interface DockAction {
  key: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  onPress: () => void;
}

/** Bottom capture dock — the touch equivalent of the web glass dock: voice, camera, and file actions in one bar. */
export function BottomDock({ actions }: { actions: DockAction[] }) {
  return (
    <BlurView intensity={40} tint="dark" style={styles.wrap}>
      {actions.map((action) => (
        <Pressable
          key={action.key}
          onPress={action.onPress}
          accessibilityLabel={action.label}
          accessibilityState={{ selected: action.active }}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <View style={[styles.iconWrap, action.active && styles.iconWrapActive]}>{action.icon}</View>
          <Text style={[styles.label, action.active && styles.labelActive]}>{action.label}</Text>
        </Pressable>
      ))}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.seam,
    backgroundColor: "rgba(22, 18, 14, 0.55)",
    overflow: "hidden",
    paddingVertical: 10,
  },
  button: {
    alignItems: "center",
    gap: 4,
    minWidth: 64,
    minHeight: 44,
    justifyContent: "center",
  },
  buttonPressed: { transform: [{ scale: 0.92 }], opacity: 0.85 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.panel2,
    borderWidth: 1,
    borderColor: COLORS.seam,
  },
  iconWrapActive: { borderColor: COLORS.amber, backgroundColor: "rgba(226, 164, 76, 0.15)" },
  label: { color: COLORS.fog, fontSize: 11 },
  labelActive: { color: COLORS.amber },
});
