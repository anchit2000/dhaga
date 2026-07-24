import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { COLORS } from "@/utils/constants";
import type { VocabTerm } from "@dhaga/core/src/voice/types";

interface VocabTermRowProps {
  term: VocabTerm;
  onEdit: (term: VocabTerm) => void;
  onRemove: (term: VocabTerm) => void;
}

/** A single taught word: tap the label to load it into the edit form, trash to remove. */
export function VocabTermRow({ term, onEdit, onRemove }: VocabTermRowProps) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.text} onPress={() => onEdit(term)} accessibilityLabel={`Edit ${term.term}`}>
        <Text style={styles.term}>{term.term}</Text>
        {term.aliases.length > 0 ? <Text style={styles.aliases}>{term.aliases.join(", ")}</Text> : null}
      </Pressable>
      <Pressable onPress={() => onRemove(term)} hitSlop={12} accessibilityLabel={`Remove ${term.term}`}>
        <Feather name="trash-2" size={18} color={COLORS.fog} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    borderColor: COLORS.seam,
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  text: { flex: 1, gap: 2 },
  term: { color: COLORS.paper, fontSize: 16 },
  aliases: { color: COLORS.fog, fontSize: 13 },
});
