import { GestureDetector, type PanGesture } from "react-native-gesture-handler";
import { StyleSheet, type ViewStyle } from "react-native";
import Animated, { type AnimatedStyle } from "react-native-reanimated";

import { COLORS, CROP_HANDLE_TOUCH_SIZE, CROP_HANDLE_VISUAL_SIZE } from "@/utils/constants";

interface CropHandleProps {
  gesture: PanGesture;
  style: AnimatedStyle<ViewStyle>;
}

/** One draggable corner of the crop rectangle. Purely presentational — the
 * gesture and position style are built by `useCropRect`, which owns the
 * shared values they read and write. */
export function CropHandle({ gesture, style }: CropHandleProps) {
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.touchArea, style]}>
        <Animated.View style={styles.dot} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    position: "absolute",
    width: CROP_HANDLE_TOUCH_SIZE,
    height: CROP_HANDLE_TOUCH_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: CROP_HANDLE_VISUAL_SIZE,
    height: CROP_HANDLE_VISUAL_SIZE,
    borderRadius: CROP_HANDLE_VISUAL_SIZE / 2,
    backgroundColor: COLORS.amber,
    borderWidth: 2,
    borderColor: COLORS.ink,
  },
});
