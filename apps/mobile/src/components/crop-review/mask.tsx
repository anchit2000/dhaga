import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

import type { Size } from "./geometry";
import type { SharedValue } from "react-native-reanimated";

interface CropMaskProps {
  /** Photo's displayed size (see `computeDisplayBox`); the mask covers exactly this area. */
  bounds: Size;
  x: SharedValue<number>;
  y: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
}

/**
 * Dims everything outside the crop rectangle using four plain rectangles
 * (top/bottom/left/right band) instead of an actual mask — there's no SVG
 * dependency in this app and four `View`s is simpler than adding one.
 */
export function CropMask({ bounds, x, y, width, height }: CropMaskProps) {
  const topStyle = useAnimatedStyle(() => ({ left: 0, top: 0, width: bounds.width, height: y.value }));
  const bottomStyle = useAnimatedStyle(() => ({
    left: 0,
    top: y.value + height.value,
    width: bounds.width,
    height: bounds.height - y.value - height.value,
  }));
  const leftStyle = useAnimatedStyle(() => ({ left: 0, top: y.value, width: x.value, height: height.value }));
  const rightStyle = useAnimatedStyle(() => ({
    left: x.value + width.value,
    top: y.value,
    width: bounds.width - x.value - width.value,
    height: height.value,
  }));

  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.band, topStyle]} />
      <Animated.View pointerEvents="none" style={[styles.band, bottomStyle]} />
      <Animated.View pointerEvents="none" style={[styles.band, leftStyle]} />
      <Animated.View pointerEvents="none" style={[styles.band, rightStyle]} />
    </>
  );
}

const styles = StyleSheet.create({
  band: { position: "absolute", backgroundColor: "rgba(13, 11, 9, 0.7)" },
});
