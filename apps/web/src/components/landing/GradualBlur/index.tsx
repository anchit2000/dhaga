"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { useIntersectionObserver, useResponsiveDimension } from "./hooks";
import {
  CURVE_FUNCTIONS,
  DEFAULT_CONFIG,
  PRESETS,
  getGradientDirection,
  mergeConfigs,
  type GradualBlurConfig,
  type GradualBlurProps,
} from "./presets";

/**
 * Stacks several backdrop-blur layers, each masked to a thin band, so
 * content fades from sharp to blurred toward one edge instead of cutting
 * off abruptly. Ported from React Bits and trimmed to this project's
 * conventions: typed config instead of loose props, and the couple of CSS
 * rules it needs (isolation, pointer-events) are inlined below rather than
 * injecting a `<style>` tag into `document.head` at import time.
 */
export function GradualBlur(props: GradualBlurProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const config: GradualBlurConfig = useMemo(() => {
    const presetConfig = props.preset ? PRESETS[props.preset] : {};
    return mergeConfigs(DEFAULT_CONFIG, presetConfig, props);
  }, [props]);

  const responsiveHeight = useResponsiveDimension(config.responsive, config.height, {
    mobile: config.mobileHeight,
    tablet: config.tabletHeight,
    desktop: config.desktopHeight,
  });
  const responsiveWidth = useResponsiveDimension(config.responsive, config.width, {
    mobile: config.mobileWidth,
    tablet: config.tabletWidth,
    desktop: config.desktopWidth,
  });

  const isVisible = useIntersectionObserver(containerRef, config.animated === "scroll");

  const blurLayers = useMemo(() => {
    const layers: { key: number; style: CSSProperties }[] = [];
    const increment = 100 / config.divCount;
    const currentStrength =
      isHovered && config.hoverIntensity ? config.strength * config.hoverIntensity : config.strength;
    const curve = CURVE_FUNCTIONS[config.curve];
    const direction = getGradientDirection(config.position);

    for (let i = 1; i <= config.divCount; i++) {
      const progress = curve(i / config.divCount);
      const blurValue = config.exponential
        ? Math.pow(2, progress * 4) * 0.0625 * currentStrength
        : 0.0625 * (progress * config.divCount + 1) * currentStrength;

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      layers.push({
        key: i,
        style: {
          position: "absolute",
          inset: 0,
          maskImage: `linear-gradient(${direction}, ${gradient})`,
          WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
          backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
          WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
          opacity: config.opacity,
          transition:
            config.animated && config.animated !== "scroll"
              ? `backdrop-filter ${config.duration} ${config.easing}`
              : undefined,
        },
      });
    }
    return layers;
  }, [config, isHovered]);

  const containerStyle: CSSProperties = useMemo(() => {
    const isVertical = config.position === "top" || config.position === "bottom";
    const isPageTarget = config.target === "page";

    const base: CSSProperties = {
      position: isPageTarget ? "fixed" : "absolute",
      pointerEvents: config.hoverIntensity ? "auto" : "none",
      opacity: isVisible ? 1 : 0,
      transition: config.animated ? `opacity ${config.duration} ${config.easing}` : undefined,
      zIndex: isPageTarget ? config.zIndex + 100 : config.zIndex,
      isolation: "isolate",
      overflow: isPageTarget ? undefined : "hidden",
      ...config.style,
    };

    if (isVertical) {
      base.height = responsiveHeight;
      base.width = responsiveWidth ?? "100%";
      base.top = config.position === "top" ? 0 : undefined;
      base.bottom = config.position === "bottom" ? 0 : undefined;
      base.left = 0;
      base.right = 0;
    } else {
      base.width = responsiveWidth ?? responsiveHeight;
      base.height = "100%";
      base.left = config.position === "left" ? 0 : undefined;
      base.right = config.position === "right" ? 0 : undefined;
      base.top = 0;
      base.bottom = 0;
    }
    return base;
  }, [config, responsiveHeight, responsiveWidth, isVisible]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none ${config.className}`}
      style={containerStyle}
      onMouseEnter={config.hoverIntensity ? () => setIsHovered(true) : undefined}
      onMouseLeave={config.hoverIntensity ? () => setIsHovered(false) : undefined}
    >
      <div className="relative h-full w-full">
        {blurLayers.map((layer) => (
          <div key={layer.key} style={layer.style} />
        ))}
      </div>
    </div>
  );
}
