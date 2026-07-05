import { Feather } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable } from "react-native";

import { COLORS } from "@/utils/constants";

function SettingsButton() {
  return (
    <Pressable onPress={() => router.push("/setup")} hitSlop={12} accessibilityLabel="Settings">
      <Feather name="settings" size={20} color={COLORS.paper} />
    </Pressable>
  );
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.ink },
          headerTintColor: COLORS.paper,
          headerTitleStyle: { color: COLORS.paper },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.ink },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Dhaga", headerRight: SettingsButton }} />
        <Stack.Screen name="setup" options={{ title: "Connect to Dhaga" }} />
      </Stack>
    </>
  );
}
