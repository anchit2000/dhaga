"use client";

import { useEffect, useState } from "react";
import { ASK_EXAMPLES, ASK_QUERIES } from "@/utils/constants/landing";
import { SectionHeading } from "./SectionHeading";

export function AskDemo() {
  return (
    <section className="border-y border-seam bg-panel-2/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <SectionHeading
          eyebrow="Answers with receipts"
          heading="Your notes, finally queryable."
          intro="Not a feed. Not a guess scraped from the web. Answers built from what you actually observed — cited back to your own notes."
        />
        <QueryTyper />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {ASK_EXAMPLES.map((example) => (
            <div key={example.query} className="rounded-lg border border-seam bg-panel p-6">
              <p className="font-mono text-sm text-amber">ask&gt; {example.query}</p>
              <p className="mt-4 text-sm text-paper">
                <span className="font-semibold">{example.answerName}</span> —{" "}
                {example.answer}
              </p>
              <p className="mt-3 border-l-2 border-seam pl-3 text-xs italic text-fog">
                From your voice note:{" "}
                <span className="font-medium not-italic text-paper">
                  “{example.receipt}”
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QueryTyper() {
  const [text, setText] = useState("");

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = setTimeout(() => setText(ASK_QUERIES[0]), 0);
      return () => clearTimeout(timer);
    }
    let queryIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      const query = ASK_QUERIES[queryIndex];
      if (!deleting) {
        charIndex += 1;
        setText(query.slice(0, charIndex));
        if (charIndex === query.length) {
          deleting = true;
          timer = setTimeout(tick, 2600);
          return;
        }
        timer = setTimeout(tick, 34 + Math.random() * 40);
        return;
      }
      charIndex -= 1;
      setText(query.slice(0, charIndex));
      if (charIndex === 0) {
        deleting = false;
        queryIndex = (queryIndex + 1) % ASK_QUERIES.length;
        timer = setTimeout(tick, 500);
        return;
      }
      timer = setTimeout(tick, 14);
    }

    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mt-10 flex max-w-2xl items-baseline gap-3 rounded-lg border border-seam bg-ink/80 px-5 py-4 font-mono text-sm">
      <span className="shrink-0 text-amber">ask&gt;</span>
      <span className="min-h-5 text-paper">
        {text}
        <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-amber align-middle" />
      </span>
    </div>
  );
}
