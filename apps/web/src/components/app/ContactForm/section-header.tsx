/** The small mono uppercase heading (with an optional hint) above each
 *  repeatable form section. A shared leaf so the section modules don't import
 *  each other just to reuse it. */
export function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-fog">{title}</h3>
      {hint ? <span className="text-[11px] text-fog">{hint}</span> : null}
    </div>
  );
}
