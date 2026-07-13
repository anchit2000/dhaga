import { COMPARISON_ROWS } from "@/utils/constants/landing";
import { SectionHeading } from "./SectionHeading";
import type { ComparisonRow } from "@/types";

const BRANDS = [
  { name: "Dhaga", sub: "that's us", us: true, marks: [{ letter: "d", color: "#e2a44c" }] },
  { name: "Card apps", sub: "Blinq · HiHello", us: false, marks: [{ letter: "B", color: "#4d7fd6" }, { letter: "H", color: "#d66a3c" }] },
  { name: "Personal CRMs", sub: "Mesh · Dex", us: false, marks: [{ letter: "M", color: "#9a938a" }, { letter: "D", color: "#7c6fd6" }] },
  { name: "Enterprise", sub: "Affinity", us: false, marks: [{ letter: "A", color: "#4da8c9" }] },
];

const CELL_KEYS: (keyof ComparisonRow)[] = ["dhaga", "cardApps", "personalCrms", "enterprise"];

export function Comparison() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24" id="compare">
      <SectionHeading eyebrow="Compare" heading="Everyone else stops at the contact." />
      <div className="mt-12 overflow-x-auto rounded-2xl border border-wash/10 bg-panel/40 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-[26%] px-6 py-6" />
              {BRANDS.map((brand) => (
                <th
                  key={brand.name}
                  className={`px-5 py-6 text-left align-top font-normal ${
                    brand.us ? "rounded-t-xl bg-amber/[0.09] shadow-[inset_0_1px_0_rgba(226,164,76,0.5)]" : ""
                  }`}
                >
                  <div className="flex -space-x-1.5">
                    {brand.marks.map((mark) => (
                      <span
                        key={mark.letter}
                        className={`flex size-7 items-center justify-center rounded-lg text-xs font-bold text-on-accent ring-2 ring-panel ${
                          brand.us ? "font-display text-base" : ""
                        }`}
                        style={{ backgroundColor: mark.color }}
                      >
                        {mark.letter}
                      </span>
                    ))}
                  </div>
                  <p className={`mt-2.5 font-medium ${brand.us ? "text-ember" : "text-paper"}`}>
                    {brand.name}
                  </p>
                  <p className="text-xs text-fog/80">{brand.sub}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, rowIndex) => (
              <tr key={row.feature} className="group border-t border-seam/60 transition-colors hover:bg-wash/[0.02]">
                <td className="px-6 py-4 text-paper">{row.feature}</td>
                {CELL_KEYS.map((key, colIndex) => (
                  <td
                    key={key}
                    className={`px-5 py-4 ${
                      colIndex === 0
                        ? `bg-amber/[0.09] font-medium text-paper ${
                            rowIndex === COMPARISON_ROWS.length - 1 ? "rounded-b-xl" : ""
                          }`
                        : "text-fog"
                    }`}
                  >
                    <Cell value={row[key]} us={colIndex === 0} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-fog/70">
        Competitor pricing as publicly listed, July 2026. Affinity from $2,000/user/year (published).
      </p>
    </section>
  );
}

function Cell({ value, us }: { value: string; us: boolean }) {
  if (value.startsWith("✓")) {
    return (
      <span className="flex items-center gap-2">
        <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${us ? "bg-amber text-on-accent" : "bg-wash/10 text-paper"}`}>
          ✓
        </span>
        {value.slice(1).trim()}
      </span>
    );
  }
  if (value.startsWith("✗")) {
    return (
      <span className="flex items-center gap-2 text-fog/60">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-wash/[0.05] text-[10px]">
          —
        </span>
        {value.slice(1).trim()}
      </span>
    );
  }
  return <span>{value}</span>;
}
