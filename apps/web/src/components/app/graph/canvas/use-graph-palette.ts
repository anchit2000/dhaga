"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { graphNodePalette, type GraphNodePalette } from "./theme";

/**
 * Node palette for the React chrome (legend dots, search rows) that draws
 * outside the sigma canvas and so can't read the container's custom
 * properties. next-themes reports `resolvedTheme` only after mount, so until
 * then this matches the app's dark default — same as the server markup, no
 * hydration mismatch.
 */
export function useGraphPalette(): GraphNodePalette {
  const { resolvedTheme } = useTheme();
  return useMemo(
    () => graphNodePalette(resolvedTheme === "light" ? "light" : "dark"),
    [resolvedTheme],
  );
}
