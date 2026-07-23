import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { isConfigured, isInsecureBaseUrl, loadSettings, saveSettings } from "@/lib/settings";
import { COLORS } from "@/utils/constants";

export default function SetupScreen() {
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings().then((settings) => {
      setBaseUrl(settings.baseUrl);
      setApiKey(settings.apiKey);
    });
  }, []);

  const canSave = baseUrl.trim().length > 0 && apiKey.trim().length > 0 && !saving;
  const insecureUrl = isInsecureBaseUrl(baseUrl);

  const save = async (): Promise<void> => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSettings({ baseUrl, apiKey });
      if (isConfigured(saved)) router.replace("/");
    } catch {
      setError("Couldn't save these settings on this device. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lede}>
          Point the app at your Dhaga server. On a dev machine, use its LAN address (for example
          http://192.168.1.20:3000) — your phone can&apos;t reach localhost.
        </Text>
        <View style={styles.field}>
          <Text style={styles.label}>Server address</Text>
          <TextInput
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="https://your-dhaga-server"
            placeholderTextColor={COLORS.fog}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!saving}
          />
          {insecureUrl ? (
            <Text style={styles.warning}>
              This address is unencrypted (http://). Your API key will be sent in the clear — anyone on
              the same network could read it. Use https://, or http://localhost, unless this is a
              trusted private network.
            </Text>
          ) : null}
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>API key</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="dhaga_…"
            placeholderTextColor={COLORS.fog}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!saving}
          />
          <Text style={styles.hint}>
            Create one in the Dhaga web app under Settings → API keys, then paste it here. It&apos;s
            stored only in this phone&apos;s secure storage.
          </Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={[styles.saveButton, !canSave && styles.saveDisabled]}
          onPress={() => void save()}
          disabled={!canSave}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.ink} />
          ) : (
            <Text style={styles.saveLabel}>Save & start scanning</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  content: { padding: 20, gap: 24 },
  lede: { color: COLORS.fog, fontSize: 15, lineHeight: 22 },
  field: { gap: 8 },
  label: { color: COLORS.paper, fontSize: 15, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.seam,
    borderWidth: 1,
    borderRadius: 10,
    color: COLORS.paper,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  hint: { color: COLORS.fog, fontSize: 13, lineHeight: 18 },
  warning: { color: COLORS.amber, fontSize: 13, lineHeight: 18 },
  error: { color: COLORS.amber, fontSize: 13, textAlign: "center" },
  saveButton: {
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  saveDisabled: { opacity: 0.5 },
  saveLabel: { color: COLORS.ink, fontSize: 16, fontWeight: "600" },
});
