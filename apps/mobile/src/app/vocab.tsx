import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useVoiceVocab } from "@/components/capture-screen/use-voice-vocab";
import { VocabTermRow } from "@/components/vocab-term-row";
import { vocabStore } from "@/lib/voice-vocab";
import { COLORS } from "@/utils/constants";
import type { VocabTerm } from "@dhaga/core/src/voice/types";

function parseAliases(input: string): string[] {
  return input.split(",").map((alias) => alias.trim()).filter(Boolean);
}

export default function VocabScreen() {
  const { reload } = useVoiceVocab();
  const [terms, setTerms] = useState<VocabTerm[]>([]);
  const [term, setTerm] = useState("");
  const [aliases, setAliases] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    setTerms(await vocabStore.load());
  }, []);

  useFocusEffect(useCallback(() => void refresh(), [refresh]));

  const canSave = term.trim().length > 0 && !saving;

  const save = async (): Promise<void> => {
    if (!canSave) return;
    setSaving(true);
    try {
      await vocabStore.upsert(term.trim(), parseAliases(aliases));
      setTerm("");
      setAliases("");
      await refresh();
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const edit = (entry: VocabTerm): void => {
    setTerm(entry.term);
    setAliases(entry.aliases.join(", "));
  };

  const remove = async (entry: VocabTerm): Promise<void> => {
    await vocabStore.remove(entry.term);
    await refresh();
    await reload();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        data={terms}
        keyExtractor={(entry) => entry.term}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.form}>
            <Text style={styles.lede}>
              Teach Dhaga how to spell names and words it keeps mishearing. Dictation fixes them automatically, on
              this device, at no cost.
            </Text>
            <View style={styles.field}>
              <Text style={styles.label}>Word or name</Text>
              <TextInput
                style={styles.input}
                value={term}
                onChangeText={setTerm}
                placeholder="Ranchit"
                placeholderTextColor={COLORS.fog}
                autoCorrect={false}
                editable={!saving}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Also heard as (optional)</Text>
              <TextInput
                style={styles.input}
                value={aliases}
                onChangeText={setAliases}
                placeholder="Rrankit, Rran chit"
                placeholderTextColor={COLORS.fog}
                autoCorrect={false}
                editable={!saving}
              />
              <Text style={styles.hint}>Comma-separated spellings you&apos;ve heard it mistranscribed as.</Text>
            </View>
            <Pressable style={[styles.saveButton, !canSave && styles.saveDisabled]} onPress={() => void save()} disabled={!canSave}>
              {saving ? <ActivityIndicator color={COLORS.ink} /> : <Text style={styles.saveLabel}>Save word</Text>}
            </Pressable>
            {terms.length > 0 ? <Text style={styles.sectionLabel}>Taught words</Text> : null}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No taught words yet.</Text>}
        renderItem={({ item }) => <VocabTermRow term={item} onEdit={edit} onRemove={(entry) => void remove(entry)} />}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  content: { padding: 20, gap: 12 },
  form: { gap: 20, paddingBottom: 8 },
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
  saveButton: { backgroundColor: COLORS.amber, borderRadius: 999, minHeight: 48, alignItems: "center", justifyContent: "center" },
  saveDisabled: { opacity: 0.5 },
  saveLabel: { color: COLORS.ink, fontSize: 16, fontWeight: "600" },
  sectionLabel: { color: COLORS.paper, fontSize: 15, fontWeight: "600", marginTop: 4 },
  empty: { color: COLORS.fog, fontSize: 14, paddingVertical: 8 },
});
