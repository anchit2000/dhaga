import type { FluidSimulation } from "./simulation";
import { createPointer, type Pointer } from "./types";
import { scaleByPixelRatio, type RGBColor } from "./utils";

export interface PointerController {
  pointer: Pointer;
  /** Attaches window listeners and returns a function that removes them. */
  bind(): () => void;
}

/** Tracks a single mouse/touch pointer and turns its movement into splats
 * on the fluid simulation. Only ever reads/writes one pointer (matching the
 * source component, which reused a single-item array for both mouse and
 * every touch point rather than tracking them independently). */
export function createPointerController(canvas: HTMLCanvasElement, sim: FluidSimulation): PointerController {
  const pointer = createPointer();
  let firstMouseMoveHandled = false;

  function correctDeltaX(delta: number): number {
    const aspectRatio = canvas.width / canvas.height;
    return aspectRatio < 1 ? delta * aspectRatio : delta;
  }

  function correctDeltaY(delta: number): number {
    const aspectRatio = canvas.width / canvas.height;
    return aspectRatio > 1 ? delta / aspectRatio : delta;
  }

  function updateDown(posX: number, posY: number) {
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = sim.generateColor();
  }

  function updateMove(posX: number, posY: number, color: RGBColor) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
    pointer.color = color;
  }

  function handleMouseDown(e: MouseEvent) {
    updateDown(scaleByPixelRatio(e.clientX), scaleByPixelRatio(e.clientY));
    const c = sim.generateColor();
    const boosted = { r: c.r * 10, g: c.g * 10, b: c.b * 10 };
    sim.splat(pointer.texcoordX, pointer.texcoordY, 10 * (Math.random() - 0.5), 30 * (Math.random() - 0.5), boosted);
  }

  function handleMouseMove(e: MouseEvent) {
    const posX = scaleByPixelRatio(e.clientX);
    const posY = scaleByPixelRatio(e.clientY);
    if (!firstMouseMoveHandled) {
      updateMove(posX, posY, sim.generateColor());
      firstMouseMoveHandled = true;
    } else {
      updateMove(posX, posY, pointer.color);
    }
  }

  function handleTouchStart(e: TouchEvent) {
    const touch = e.targetTouches[0];
    if (touch) updateDown(scaleByPixelRatio(touch.clientX), scaleByPixelRatio(touch.clientY));
  }

  function handleTouchMove(e: TouchEvent) {
    const touch = e.targetTouches[0];
    if (touch) updateMove(scaleByPixelRatio(touch.clientX), scaleByPixelRatio(touch.clientY), pointer.color);
  }

  function handleTouchEnd() {
    pointer.down = false;
  }

  function bind() {
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }

  return { pointer, bind };
}
