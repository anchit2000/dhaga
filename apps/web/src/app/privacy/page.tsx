import Link from "next/link";

export const metadata = { title: "Privacy — Dhaga" };

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "Your graph is yours",
    body: "Dhaga stores your contacts, notes, and everything derived from them in your own database — the embedded local database by default, or a Postgres instance you control. There is no central Dhaga server reading your graph.",
  },
  {
    heading: "AI is opt-in and user-triggered",
    body: "Cloud AI calls (extraction, search answers, drafts, briefs, enrichment, card scanning) happen only when you press the button and only using your own API key. Nothing runs in the background. Scanned card photos are kept in your own database as visual receipts — a setting you can turn off, with one-click deletion of everything already stored.",
  },
  {
    heading: "The browser extension reads nothing silently",
    body: "The extension accesses the active tab only at the moment you click its icon, sends exactly what you selected, and only to the Dhaga instance you configured. No content scripts, no background scraping, no analytics.",
  },
  {
    heading: "Every AI fact keeps a receipt",
    body: "Facts and relationships always link to the note they came from. Deleting a note removes everything derived from it; \"Forget this person\" removes the contact and every trace — notes, facts, connections, and search index entries.",
  },
  {
    heading: "You can always leave",
    body: "Export your full graph as CSV, vCard, or JSON at any time. No lock-in is a feature.",
  },
  {
    heading: "Waitlist emails",
    body: "If you join the waitlist we store your email address to send the invite, and nothing else. One email confirms the signup; unsubscribe by replying.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="font-display text-lg text-paper">
        dhaga<span className="text-amber">.</span>
      </Link>
      <h1 className="mt-8 font-display text-3xl tracking-tight text-paper">
        Privacy
      </h1>
      <p className="mt-2 text-sm text-fog">
        The short version: local-first, user-triggered, receipts for
        everything, export anytime. The long version is the code —{" "}
        <a
          href="https://github.com/anchit2000/dhaga"
          className="text-amber underline-offset-2 hover:underline"
        >
          it&apos;s open source
        </a>
        .
      </p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <h2 className="font-display text-lg text-paper">{section.heading}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-fog">
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
