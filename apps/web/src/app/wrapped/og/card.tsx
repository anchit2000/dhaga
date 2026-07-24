import { WRAPPED_CARD_COLORS, WRAPPED_CARD_SIZES } from "@/utils/constants/wrapped";
import type { WrappedCardParams } from "@/lib/wrapped/og-url";
import type { WrappedCardFormat } from "@dhaga/core/src/api/wrapped";
import type { ReactElement } from "react";

// The satori element for the Network Wrapped share image, split out of route.tsx
// to keep each file under the 150-line rule. Font-free, inline-styled, and
// CONTACT-FREE (counts + scope label + cluster CATEGORY only). Every div with
// more than one child sets display:flex, as satori requires.

const C = WRAPPED_CARD_COLORS;

interface CardLayout {
  pad: number;
  hero: number;
  heroLabel: number;
  stat: number;
  label: number;
  eyebrow: number;
  foot: number;
}

const LAYOUT: Record<WrappedCardFormat, CardLayout> = {
  landscape: { pad: 66, hero: 168, heroLabel: 30, stat: 58, label: 21, eyebrow: 24, foot: 26 },
  square: { pad: 92, hero: 260, heroLabel: 38, stat: 82, label: 25, eyebrow: 29, foot: 29 },
  story: { pad: 100, hero: 300, heroLabel: 44, stat: 92, label: 29, eyebrow: 33, foot: 33 },
};

function knot(foot: number): ReactElement {
  return (
    <svg width={foot * 1.6} height={foot * 1.33} viewBox="0 0 24 20" fill="none">
      <path
        d="M2 16 C 7 16, 8 6, 13 6 C 17 6, 17 11, 13.5 11 C 10 11, 10 6.5, 14.5 5 C 18 3.8, 20 4.5, 22 4"
        stroke={C.amber}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="2" cy="16" r="2" fill={C.paper} />
      <circle cx="22" cy="4" r="2" fill={C.paper} />
    </svg>
  );
}

export function renderWrappedCard(
  params: WrappedCardParams,
  format: WrappedCardFormat,
  valid: boolean,
): ReactElement {
  const size = WRAPPED_CARD_SIZES[format];
  const l = LAYOUT[format];
  const stats = [
    { value: params.totalNetwork, label: "in network" },
    { value: params.eventsAttended, label: "events" },
    { value: params.overdueFollowUps, label: "to follow up" },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: C.ink,
        backgroundImage: `linear-gradient(155deg, ${C.panel2}, ${C.ink})`,
        padding: l.pad,
        color: C.paper,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 14, height: 14, borderRadius: 9999, backgroundColor: C.amber, marginRight: 14 }} />
          <div style={{ fontSize: l.eyebrow, letterSpacing: 4, textTransform: "uppercase", color: C.fog }}>
            dhaga · network wrapped
          </div>
        </div>
        <div style={{ display: "flex", fontSize: l.eyebrow * 1.5, fontWeight: 600, color: C.paper }}>
          {valid ? params.scopeLabel : "Your networking, in review"}
        </div>
      </div>

      {valid ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: l.hero, fontWeight: 800, lineHeight: 1, color: C.amber }}>
              {params.newPeople}
            </div>
            <div style={{ display: "flex", fontSize: l.heroLabel, color: C.fog, marginLeft: 20, marginBottom: l.hero * 0.12 }}>
              new connections
            </div>
          </div>
          <div style={{ display: "flex", gap: l.pad, marginTop: l.pad * 0.7, flexWrap: "wrap" }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: l.stat, fontWeight: 700, color: C.paper }}>{s.value}</div>
                <div style={{ display: "flex", fontSize: l.label, textTransform: "uppercase", letterSpacing: 2, color: C.fog }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          {params.clusterKey ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                alignSelf: "flex-start",
                marginTop: l.pad * 0.6,
                padding: `${l.label * 0.5}px ${l.label}px`,
                borderRadius: 9999,
                border: `1px solid ${C.seam}`,
                fontSize: l.label * 1.15,
                color: C.paper,
              }}
            >
              Top circle · {params.clusterKey} · {params.clusterCount}
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ display: "flex", fontSize: l.heroLabel * 1.2, color: C.fog, maxWidth: size.width * 0.72 }}>
          Make your own Network Wrapped at dhaga.app
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${C.seam}`,
          paddingTop: l.pad * 0.4,
          fontSize: l.foot,
          color: C.fog,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {knot(l.foot)}
          <div style={{ display: "flex", marginLeft: 16 }}>
            <span style={{ color: C.paper }}>dhaga</span>
            <span style={{ color: C.amber }}>.</span>
          </div>
        </div>
        <div style={{ display: "flex" }}>the AI personal CRM</div>
      </div>
    </div>
  );
}
