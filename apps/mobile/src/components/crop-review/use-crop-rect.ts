import { Gesture, type PanGesture } from "react-native-gesture-handler";
import { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import { CROP_HANDLE_TOUCH_SIZE, CROP_MIN_SIZE } from "@/utils/constants";

import { moveRect, resizeRectFromCorner, type Corner, type Rect, type Size } from "./geometry";

const HALF_TOUCH = CROP_HANDLE_TOUCH_SIZE / 2;

/**
 * Owns the crop rectangle's shared values and every gesture that mutates
 * them, all in one hook. Reanimated shared values are only safe to write
 * from the scope that created them — the React Compiler's immutability
 * check flags `sharedValue.value = x` when `sharedValue` arrived as a prop
 * or hook argument, so `x`/`y`/`width`/`height` never leave this file except
 * as read-only values (for `CropMask`) or already-applied styles/gestures.
 */
export function useCropRect(bounds: Size, defaultRect: Rect) {
  const x = useSharedValue(defaultRect.x);
  const y = useSharedValue(defaultRect.y);
  const width = useSharedValue(defaultRect.width);
  const height = useSharedValue(defaultRect.height);

  const moveStart = useSharedValue({ x: 0, y: 0 });
  const movePan = Gesture.Pan()
    .onStart(() => {
      moveStart.value = { x: x.value, y: y.value };
    })
    .onUpdate((event) => {
      const next = moveRect(
        { x: moveStart.value.x, y: moveStart.value.y, width: width.value, height: height.value },
        event.translationX,
        event.translationY,
        bounds,
      );
      x.value = next.x;
      y.value = next.y;
    });
  const rectStyle = useAnimatedStyle(() => ({ left: x.value, top: y.value, width: width.value, height: height.value }));

  const resizeStart = useSharedValue<Rect>({ x: 0, y: 0, width: 0, height: 0 });
  function cornerGesture(corner: Corner): PanGesture {
    return Gesture.Pan()
      .onStart(() => {
        resizeStart.value = { x: x.value, y: y.value, width: width.value, height: height.value };
      })
      .onUpdate((event) => {
        const next = resizeRectFromCorner(resizeStart.value, corner, event.translationX, event.translationY, bounds, CROP_MIN_SIZE);
        x.value = next.x;
        y.value = next.y;
        width.value = next.width;
        height.value = next.height;
      });
  }

  const topLeftStyle = useAnimatedStyle(() => ({ left: x.value - HALF_TOUCH, top: y.value - HALF_TOUCH }));
  const topRightStyle = useAnimatedStyle(() => ({ left: x.value + width.value - HALF_TOUCH, top: y.value - HALF_TOUCH }));
  const bottomLeftStyle = useAnimatedStyle(() => ({ left: x.value - HALF_TOUCH, top: y.value + height.value - HALF_TOUCH }));
  const bottomRightStyle = useAnimatedStyle(() => ({
    left: x.value + width.value - HALF_TOUCH,
    top: y.value + height.value - HALF_TOUCH,
  }));

  const handles: { corner: Corner; gesture: PanGesture; style: ReturnType<typeof useAnimatedStyle> }[] = [
    { corner: "topLeft", gesture: cornerGesture("topLeft"), style: topLeftStyle },
    { corner: "topRight", gesture: cornerGesture("topRight"), style: topRightStyle },
    { corner: "bottomLeft", gesture: cornerGesture("bottomLeft"), style: bottomLeftStyle },
    { corner: "bottomRight", gesture: cornerGesture("bottomRight"), style: bottomRightStyle },
  ];

  function getRect(): Rect {
    return { x: x.value, y: y.value, width: width.value, height: height.value };
  }

  return { x, y, width, height, movePan, rectStyle, handles, getRect };
}
