"use client";

import { motion, useMotionValue, useSpring, useTransform, type SpringOptions } from "motion/react";
import { useRef, type ReactNode } from "react";
import "./dock.css";

export interface DockItemData {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

function DockItem({
  icon,
  label,
  active,
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  spring: SpringOptions;
  distance: number;
  magnification: number;
  baseItemSize: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: baseItemSize };
    return val - rect.x - baseItemSize / 2;
  });
  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`dock-item-wrap ${active ? "dock-item-wrap--active" : ""}`}
      aria-label={label}
      aria-pressed={active}
    >
      <motion.div ref={ref} style={{ width: size, height: size }} className="dock-item">
        {icon}
      </motion.div>
      <span className="dock-item-label">{label}</span>
    </button>
  );
}

const DEFAULT_SPRING: SpringOptions = { mass: 0.1, stiffness: 150, damping: 12 };

/** Bottom action dock (React Bits' Dock, adapted): icons magnify toward the mouse on desktop; captions stay static so touch devices get the same affordance without hover. */
export function Dock({
  items,
  className = "",
  spring = DEFAULT_SPRING,
  magnification = 62,
  distance = 140,
  panelHeight = 60,
  baseItemSize = 48,
}: {
  items: DockItemData[];
  className?: string;
  spring?: SpringOptions;
  magnification?: number;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <div
      onMouseMove={({ pageX }) => mouseX.set(pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={`dock-panel ${className}`}
      style={{ minHeight: panelHeight }}
      role="toolbar"
      aria-label="Quick add actions"
    >
      {items.map((item) => (
        <DockItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          active={item.active}
          onClick={item.onClick}
          mouseX={mouseX}
          spring={spring}
          distance={distance}
          magnification={magnification}
          baseItemSize={baseItemSize}
        />
      ))}
    </div>
  );
}
