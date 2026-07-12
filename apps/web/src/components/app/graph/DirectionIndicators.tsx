import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DirectionCounts } from "./viewport";

interface DirectionIndicatorsProps {
  counts: DirectionCounts;
  onNavigate: (direction: keyof DirectionCounts) => void;
}

export function DirectionIndicators({ counts, onNavigate }: DirectionIndicatorsProps) {
  return (
    <>
      <Indicator className="top-3 left-1/2 -translate-x-1/2" count={counts.north} onClick={() => onNavigate("north")} icon={<ArrowUp />} />
      <Indicator className="right-3 top-1/2 -translate-y-1/2" count={counts.east} onClick={() => onNavigate("east")} icon={<ArrowRight />} />
      <Indicator className="bottom-3 left-1/2 -translate-x-1/2" count={counts.south} onClick={() => onNavigate("south")} icon={<ArrowDown />} />
      <Indicator className="left-3 top-1/2 -translate-y-1/2" count={counts.west} onClick={() => onNavigate("west")} icon={<ArrowLeft />} />
    </>
  );
}

function Indicator({ className, count, onClick, icon }: { className: string; count: number; onClick: () => void; icon: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className={`absolute z-10 gap-1 bg-ink/90 text-xs backdrop-blur ${className}`}>
      <span className="size-3.5">{icon}</span>
      {count.toLocaleString()} more
    </Button>
  );
}
