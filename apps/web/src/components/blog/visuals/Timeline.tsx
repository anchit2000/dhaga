import { Figure } from "@/components/blog/visuals/Figure";
import type { CSSProperties, ReactElement } from "react";

interface TimelineItem {
  time: string;
  label: string;
  detail?: string;
  accent?: boolean;
}

interface TimelineProps {
  items: TimelineItem[];
  caption?: string;
}

// A filled amber dot marks an accented (highlighted) moment; other moments get
// a hollow panel-2 dot with an amber ring.
const ACCENT_DOT: CSSProperties = {
  backgroundColor: "var(--color-amber)",
  borderColor: "var(--color-amber)",
  boxShadow: "0 0 0 3px color-mix(in srgb, var(--color-amber) 22%, transparent)",
};
const PLAIN_DOT: CSSProperties = {
  backgroundColor: "var(--color-panel-2)",
  borderColor: "var(--color-amber)",
};

// A vertical timeline with a seam rail down the left and an amber dot per item.
export function Timeline({ items, caption }: TimelineProps): ReactElement {
  return (
    <Figure caption={caption}>
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute bottom-2 left-2 top-2 w-px"
          style={{ backgroundColor: "var(--color-seam)" }}
        />
        <ol className="space-y-6">
          {items.map((item, index) => (
            <li key={index} className="relative pl-8">
              <span
                aria-hidden="true"
                className="absolute left-2 top-1.5 size-3 -translate-x-1/2 rounded-full border-2"
                style={item.accent ? ACCENT_DOT : PLAIN_DOT}
              />
              <div className="font-mono text-xs text-fog">{item.time}</div>
              <div className="font-medium text-paper">{item.label}</div>
              {item.detail ? (
                <div className="mt-0.5 text-sm text-fog">{item.detail}</div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </Figure>
  );
}
