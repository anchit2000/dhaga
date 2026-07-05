import type { RefObject } from "react";

type ChannelSelector = "R" | "G" | "B";

/** The `<filter>` element GlassSurface's backdrop-filter references — split out to keep GlassSurface.tsx under the file-length limit. */
export function GlassFilterDefs({
  filterId,
  feImageRef,
  redChannelRef,
  greenChannelRef,
  blueChannelRef,
  gaussianBlurRef,
}: {
  filterId: string;
  feImageRef: RefObject<SVGFEImageElement | null>;
  redChannelRef: RefObject<SVGFEDisplacementMapElement | null>;
  greenChannelRef: RefObject<SVGFEDisplacementMapElement | null>;
  blueChannelRef: RefObject<SVGFEDisplacementMapElement | null>;
  gaussianBlurRef: RefObject<SVGFEGaussianBlurElement | null>;
}) {
  return (
    <svg className="glass-surface__filter" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id={filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
          <feImage ref={feImageRef} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />

          <feDisplacementMap ref={redChannelRef} in="SourceGraphic" in2="map" result="dispRed" />
          <feColorMatrix
            in="dispRed"
            type="matrix"
            values="1 0 0 0 0
                    0 0 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
            result="red"
          />

          <feDisplacementMap ref={greenChannelRef} in="SourceGraphic" in2="map" result="dispGreen" />
          <feColorMatrix
            in="dispGreen"
            type="matrix"
            values="0 0 0 0 0
                    0 1 0 0 0
                    0 0 0 0 0
                    0 0 0 1 0"
            result="green"
          />

          <feDisplacementMap ref={blueChannelRef} in="SourceGraphic" in2="map" result="dispBlue" />
          <feColorMatrix
            in="dispBlue"
            type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0
                    0 0 1 0 0
                    0 0 0 1 0"
            result="blue"
          />

          <feBlend in="red" in2="green" mode="screen" result="rg" />
          <feBlend in="rg" in2="blue" mode="screen" result="output" />
          <feGaussianBlur ref={gaussianBlurRef} in="output" stdDeviation="0.7" />
        </filter>
      </defs>
    </svg>
  );
}

export type { ChannelSelector };
