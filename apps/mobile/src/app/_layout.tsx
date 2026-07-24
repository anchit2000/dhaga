import { Feather } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, View } from "react-native";

import { COLORS } from "@/utils/constants";

function HeaderActions() {
  return (
    <View style={styles.headerActions}>
      <Pressable onPress={() => router.push("/import")} hitSlop={12} accessibilityLabel="Import contacts">
        <Feather name="users" size={20} color={COLORS.paper} />
      </Pressable>
      <Pressable onPress={() => router.push("/setup")} hitSlop={12} accessibilityLabel="Settings">
        <Feather name="settings" size={20} color={COLORS.paper} />
      </Pressable>
    </View>
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
        <Stack.Screen name="index" options={{ title: "Dhaga", headerRight: HeaderActions }} />
        <Stack.Screen name="setup" options={{ title: "Connect to Dhaga" }} />
        <Stack.Screen name="import" options={{ title: "Import contacts" }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", alignItems: "center", gap: 20 },
});
