import { forwardRef, useImperativeHandle } from "react";
import { GestureDetector } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import { COLORS } from "@/utils/constants";

import { CropHandle } from "./crop-handle";
import { type Rect, type Size } from "./geometry";
import { CropMask } from "./mask";
import { useCropRect } from "./use-crop-rect";

export interface CropOverlayHandle {
  /** Current crop rectangle in display coordinates, read at "Use photo" time. */
  getRect: () => Rect;
}

interface CropOverlayProps {
  /** Photo's displayed size (see `computeDisplayBox`); this overlay fills exactly that area. */
  bounds: Size;
  /** Starting crop rectangle; only used to seed the gesture state on mount. */
  defaultRect: Rect;
}

/** Draggable/resizable crop rectangle over the captured photo: a dim mask
 * outside it, a pan gesture to move it, and four corner handles to resize it. */
export const CropOverlay = forwardRef<CropOverlayHandle, CropOverlayProps>(function CropOverlay(
  { bounds, defaultRect },
  ref,
) {
  const crop = useCropRect(bounds, defaultRect);

  useImperativeHandle(ref, () => ({ getRect: crop.getRect }));

  return (
    <>
      <CropMask bounds={bounds} x={crop.x} y={crop.y} width={crop.width} height={crop.height} />
      <GestureDetector gesture={crop.movePan}>
        <Animated.View style={[styles.rect, crop.rectStyle]} />
      </GestureDetector>
      {crop.handles.map((handle) => (
        <CropHandle key={handle.corner} gesture={handle.gesture} style={handle.style} />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  rect: { position: "absolute", borderWidth: 2, borderColor: COLORS.amber },
});
