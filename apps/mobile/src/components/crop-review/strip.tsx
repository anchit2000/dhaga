import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";

import { COLORS } from "@/utils/constants";

import { CropReviewView } from "./index";
import { stripStyles as styles } from "./strip-styles";

import type { CapturedPhoto } from "@/components/camera-capture-view";

export interface CropReviewStripProps {
  /** The photos captured this batch — front+back of a card, or leaflet pages. */
  photos: CapturedPhoto[];
  /** Held during the scan so the buttons disable rather than double-fire. */
  busy: boolean;
  onCrop: (index: number, cropped: CapturedPhoto) => void;
  onRemove: (index: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Multi-image review between capture and scan: a horizontally scrollable
 * thumbnail strip where each photo can be cropped (reusing CropReviewView) or
 * removed, and a confirm that sends the whole batch as one merged contact.
 * Tapping a thumbnail opens the single-image crop; confirming it swaps that
 * photo in place and returns to the strip.
 */
export function CropReviewStrip({ photos, busy, onCrop, onRemove, onConfirm, onCancel }: CropReviewStripProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  if (editingIndex != null) {
    const editing = photos[editingIndex];
    if (editing) {
      return (
        <CropReviewView
          photoUri={editing.uri}
          photoWidth={editing.width}
          photoHeight={editing.height}
          onCancel={() => setEditingIndex(null)}
          onConfirm={(cropped) => {
            onCrop(editingIndex, cropped);
            setEditingIndex(null);
          }}
        />
      );
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </Text>
        <Text style={styles.subtitle}>These merge into one contact. Tap a photo to crop it.</Text>
      </View>
      <View style={styles.stripArea}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
          {photos.map((photo, index) => {
            const canCrop = photo.width > 0 && photo.height > 0;
            return (
              <View key={`${photo.uri}-${index}`} style={styles.thumbWrap}>
                <Pressable
                  style={styles.thumb}
                  onPress={() => setEditingIndex(index)}
                  disabled={busy || !canCrop}
                  accessibilityLabel={`Crop photo ${index + 1}`}
                >
                  <Image source={{ uri: photo.uri }} style={styles.thumbImage} />
                  {canCrop ? (
                    <View style={styles.cropBadge}>
                      <Feather name="crop" size={13} color={COLORS.paper} />
                    </View>
                  ) : null}
                </Pressable>
                <Pressable
                  style={styles.removeButton}
                  onPress={() => onRemove(index)}
                  disabled={busy}
                  hitSlop={8}
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <Feather name="x" size={16} color={COLORS.paper} />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={onCancel} disabled={busy}>
          <Text style={styles.cancelLabel}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.confirmButton, (busy || photos.length === 0) && styles.confirmButtonDisabled]}
          onPress={onConfirm}
          disabled={busy || photos.length === 0}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.ink} />
          ) : (
            <Text style={styles.confirmLabel}>
              Scan {photos.length} photo{photos.length === 1 ? "" : "s"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
