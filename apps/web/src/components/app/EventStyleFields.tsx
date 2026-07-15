"use client";

import { useState } from "react";
import { Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_COLORS, EVENT_EMOJIS, eventColorHex } from "@/utils/constants/events";

/**
 * Colour + emoji picker for a group. Selections are held in local state and
 * mirrored to hidden `color`/`emoji` inputs so they post with the enclosing
 * form (create or the detail-page editor). Clearing a value posts empty, which
 * the server action reads as "unset".
 */
export function EventStyleFields({
  defaultEmoji = null,
  defaultColor = null,
}: {
  defaultEmoji?: string | null;
  defaultColor?: string | null;
}) {
  const [emoji, setEmoji] = useState<string | null>(defaultEmoji);
  const [color, setColor] = useState<string | null>(defaultColor);
  const [open, setOpen] = useState(false);
  const hex = eventColorHex(color);

  return (
    <div className="space-y-2">
      <input type="hidden" name="emoji" value={emoji ?? ""} />
      <input type="hidden" name="color" value={color ?? ""} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Choose emoji"
          aria-expanded={open}
          className="flex size-9 items-center justify-center rounded-full border border-seam text-base transition-colors hover:bg-wash/[0.04]"
          style={hex ? { backgroundColor: `${hex}26`, color: hex } : undefined}
        >
          {emoji ?? <Smile className="size-4 text-fog" />}
        </button>

        <div className="flex flex-wrap items-center gap-1.5">
          {EVENT_COLORS.map((option) => (
            <button
              key={option.token}
              type="button"
              aria-label={option.label}
              aria-pressed={color === option.token}
              onClick={() => setColor((current) => (current === option.token ? null : option.token))}
              className={cn(
                "size-6 rounded-full ring-offset-2 ring-offset-panel transition-shadow",
                color === option.token && "ring-2 ring-paper",
              )}
              style={{ backgroundColor: option.hex }}
            />
          ))}
          {color ? (
            <button
              type="button"
              onClick={() => setColor(null)}
              aria-label="Clear colour"
              className="ml-0.5 text-fog transition-colors hover:text-paper"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="rounded-xl border border-seam bg-panel p-2">
          <div className="grid grid-cols-8 gap-1">
            {EVENT_EMOJIS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setEmoji(option);
                  setOpen(false);
                }}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg text-base transition-colors hover:bg-wash/[0.06]",
                  emoji === option && "bg-wash/[0.08] ring-1 ring-seam",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          {emoji ? (
            <button
              type="button"
              onClick={() => {
                setEmoji(null);
                setOpen(false);
              }}
              className="mt-1.5 px-1 text-xs text-fog transition-colors hover:text-paper"
            >
              Remove emoji
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
