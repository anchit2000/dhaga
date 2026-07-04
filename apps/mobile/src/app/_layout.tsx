import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { COLORS } from "@/utils/constants";

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
        <Stack.Screen name="index" options={{ title: "Dhaga" }} />
        <Stack.Screen name="setup" options={{ title: "Connect to Dhaga" }} />
      </Stack>
    </>
  );
}
