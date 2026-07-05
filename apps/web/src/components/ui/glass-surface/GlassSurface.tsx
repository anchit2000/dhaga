"use client";

import { useEffect, useRef, useId, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { noSubscription } from "@/lib/utils";
import { buildDisplacementMap, supportsSvgBackdropFilter } from "./displacement-map";
import { GlassFilterDefs } from "./GlassFilterDefs";
import "./glass-surface.css";

type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "difference" | "color-dodge" | "color-burn";

export interface GlassSurfaceProps {
  children?: ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  xChannel?: "R" | "G" | "B";
  yChannel?: "R" | "G" | "B";
  mixBlendMode?: BlendMode;
  className?: string;
  style?: CSSProperties;
}

/** Glassmorphic container (React Bits' GlassSurface) using an SVG backdrop-filter for chromatic-aberration distortion, with a plain blur fallback where SVG backdrop-filters aren't supported (Safari, Firefox). */
export function GlassSurface({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  displace = 0,
  backgroundOpacity = 0,
  saturation = 1,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = "R",
  yChannel = "G",
  mixBlendMode = "difference",
  className = "",
  style = {},
}: GlassSurfaceProps) {
  const uniqueId = useId().replace(/:/g, "-");
  const filterId = `glass-filter-${uniqueId}`;
  const redGradId = `red-grad-${uniqueId}`;
  const blueGradId = `blue-grad-${uniqueId}`;

  const svgSupported = useSyncExternalStore(
    noSubscription,
    () => supportsSvgBackdropFilter(filterId),
    () => false,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const redChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const greenChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const blueChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const gaussianBlurRef = useRef<SVGFEGaussianBlurElement>(null);

  const updateDisplacementMap = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    feImageRef.current?.setAttribute(
      "href",
      buildDisplacementMap({
        width: rect?.width || 400,
        height: rect?.height || 200,
        borderRadius,
        borderWidth,
        brightness,
        opacity,
        blur,
        mixBlendMode,
        redGradId,
        blueGradId,
      }),
    );
  };

  useEffect(() => {
    updateDisplacementMap();
    [
      { ref: redChannelRef, offset: redOffset },
      { ref: greenChannelRef, offset: greenOffset },
      { ref: blueChannelRef, offset: blueOffset },
    ].forEach(({ ref, offset }) => {
      ref.current?.setAttribute("scale", (distortionScale + offset).toString());
      ref.current?.setAttribute("xChannelSelector", xChannel);
      ref.current?.setAttribute("yChannelSelector", yChannel);
    });
    gaussianBlurRef.current?.setAttribute("stdDeviation", displace.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, borderRadius, borderWidth, brightness, opacity, blur, displace, distortionScale, redOffset, greenOffset, blueOffset, xChannel, yChannel, mixBlendMode]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(() => setTimeout(updateDisplacementMap, 0));
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle = {
    ...style,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    "--glass-frost": backgroundOpacity,
    "--glass-saturation": saturation,
    "--filter-id": `url(#${filterId})`,
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`glass-surface ${svgSupported ? "glass-surface--svg" : "glass-surface--fallback"} ${className}`}
      style={containerStyle}
    >
      <GlassFilterDefs
        filterId={filterId}
        feImageRef={feImageRef}
        redChannelRef={redChannelRef}
        greenChannelRef={greenChannelRef}
        blueChannelRef={blueChannelRef}
        gaussianBlurRef={gaussianBlurRef}
      />
      <div className="glass-surface__content">{children}</div>
    </div>
  );
}
