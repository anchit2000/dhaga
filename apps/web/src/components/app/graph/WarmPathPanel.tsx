"use client";

import { useActionState, useRef } from "react";
import { MoveRight } from "lucide-react";
import { findWarmPathsAction, type WarmPathState } from "@/lib/actions/graph";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "../SubmitButton";

export interface WarmPathTarget {
  id: string;
  label: string;
  kind: "contact" | "company";
}

/** "Who can intro me to X?" — pick a target, get chains from your people. */
export function WarmPathPanel({ targets }: { targets: WarmPathTarget[] }) {
  const [state, formAction] = useActionState<WarmPathState, FormData>(
    findWarmPathsAction,
    {},
  );
  const selectRef = useRef<HTMLSelectElement>(null);

  return (
    <div className="space-y-3 rounded-2xl border border-seam bg-panel p-4">
      <form
        action={(formData) => {
          const option =
            selectRef.current?.selectedOptions[0]?.textContent ?? "";
          formData.set("targetLabel", option);
          formAction(formData);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <p className="mr-1 text-sm font-medium text-paper">Warm path to</p>
        <Select
          ref={selectRef}
          name="targetId"
          required
          defaultValue=""
          className="h-9 w-56 text-sm"
          aria-label="Warm path target"
        >
          <option value="" disabled>
            Pick a company or person…
          </option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.kind === "company" ? "🏢 " : ""}
              {target.label}
            </option>
          ))}
        </Select>
        <SubmitButton className="h-9 px-4 text-sm">Find path</SubmitButton>
      </form>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      {state.paths && state.paths.length === 0 ? (
        <p className="text-sm text-fog">
          No thread reaches {state.targetLabel || "that target"} yet — capture
          more of the people around them.
        </p>
      ) : null}
      {state.paths?.map((path, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber/20 bg-amber/[0.04] px-3 py-2"
        >
          <PathChip label="You" kind="you" />
          {path.nodes.map((node) => (
            <span key={node.id} className="flex items-center gap-1.5">
              <MoveRight className="size-3 text-fog/60" aria-hidden />
              <PathChip label={node.label} kind={node.kind} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function PathChip({
  label,
  kind,
}: {
  label: string;
  kind: "you" | "contact" | "company";
}) {
  return (
    <span
      className={
        kind === "company"
          ? "rounded-md border border-seam bg-paper/[0.05] px-2 py-0.5 text-xs text-paper/90"
          : kind === "you"
            ? "rounded-full bg-amber/20 px-2 py-0.5 text-xs font-medium text-amber"
            : "rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-xs text-amber"
      }
    >
      {label}
    </span>
  );
}
