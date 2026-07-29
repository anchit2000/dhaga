import { DetailChips } from "./DetailChips";
import type { ContactDetail, PositionView } from "@/lib/repo/contacts";
import { isEducationPredicate } from "@dhaga/core";
import type { Address } from "@dhaga/core";

function formatAddress(address: Address): string {
  return [address.street, address.city, address.region, address.postalCode, address.country]
    .filter(Boolean)
    .join(", ");
}

/**
 * One dignified block of position rows — used for both Experience (employment
 * and other affiliations) and Education. Identical layout; only the heading and
 * the current-state badge word ("Current" vs "Studying") differ.
 */
function PositionGroup({
  label,
  items,
  currentLabel,
}: {
  label: string;
  items: PositionView[];
  currentLabel: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-fog">
        {label}
      </p>
      <ul className="space-y-2">
        {items.map((position) => (
          <li key={position.id} className="text-sm text-paper">
            <div className="flex flex-wrap items-center gap-1.5">
              <span>
                {[position.title, position.companyName].filter(Boolean).join(" · ") || "—"}
              </span>
              {position.isCurrent ? (
                <span className="rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ember">
                  {currentLabel}
                </span>
              ) : null}
            </div>
            {position.department ? (
              <p className="text-xs text-fog">{position.department}</p>
            ) : null}
            {position.startedAt || position.endedAt ? (
              <p className="text-xs text-fog">
                {[position.startedAt, position.endedAt ?? "present"]
                  .filter(Boolean)
                  .join(" – ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The contact's info panel: full position history (Experience + Education as
 * separate blocks), labeled contact methods, and the rich extras (addresses,
 * important dates, custom fields) that make an imported contact whole. Only
 * sections with data render — empty ones vanish.
 */
export function ContactInfoCard({ detail }: { detail: ContactDetail }) {
  const { contact, positions } = detail;
  // Education rows carry an education predicate (studied_at / attended); a null
  // relation, and any other affiliation, is Experience.
  const education = positions.filter((p) => isEducationPredicate(p.relation ?? ""));
  const experience = positions.filter((p) => !isEducationPredicate(p.relation ?? ""));
  const addresses = contact.addresses.filter((a) => formatAddress(a) || a.label);
  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-seam bg-panel p-4 sm:grid-cols-2 lg:grid-cols-1">
      <PositionGroup label="Experience" items={experience} currentLabel="Current" />
      <PositionGroup label="Education" items={education} currentLabel="Studying" />

      <DetailChips label="Email" values={contact.emails} />
      <DetailChips label="Phone" values={contact.phones} />
      <DetailChips label="Links" values={contact.links} />
      <DetailChips label="Location" values={contact.location ? [contact.location] : []} />

      {addresses.length > 0 ? (
        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-fog">
            Addresses
          </p>
          <ul className="space-y-1.5 text-sm text-paper">
            {addresses.map((address, index) => (
              <li key={index}>
                {address.label ? (
                  <span className="text-fog">{address.label}: </span>
                ) : null}
                {formatAddress(address)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DetailChips
        label="Dates"
        values={contact.importantDates.map((date) => `${date.label}: ${date.value}`)}
      />
      <DetailChips
        label="More"
        values={contact.customFields.map((field) => `${field.label}: ${field.value}`)}
      />
    </div>
  );
}
