import { describe, expect, it } from "vitest";
import {
  buildBriefPrompt,
  buildContactParsePrompt,
  buildDraftPrompt,
  buildEnrichmentPrompt,
  buildNoteExtractionPrompt,
  buildSearchAnswerPrompt,
  buildSearchQueryPrompt,
  buildSignalDetectionPrompt,
} from "@dhaga/core";

const todayIso = new Date().toISOString().slice(0, 10);

/**
 * Claude's training cutoff is not "now" — every prompt that reasons about
 * recency (job changes, "last touch", follow-up timing) must tell the model
 * today's date, in the volatile user prompt (never the cached system
 * prompt, or caching breaks daily). This guards that contract across every
 * builder that's supposed to carry it.
 */
describe("date-sensitive prompts carry today's date", () => {
  it("contact parsing", () => {
    expect(buildContactParsePrompt("some text")).toContain(todayIso);
  });

  it("note extraction", () => {
    expect(buildNoteExtractionPrompt("Sam", "met at a conference")).toContain(todayIso);
  });

  it("search query understanding + answer", () => {
    expect(buildSearchQueryPrompt("who did I meet in fintech")).toContain(todayIso);
    expect(buildSearchAnswerPrompt("who did I meet in fintech", "candidates")).toContain(
      todayIso,
    );
  });

  it("follow-up drafts", () => {
    const prompt = buildDraftPrompt({
      contactName: "Sam",
      title: null,
      company: null,
      sessionNames: [],
      facts: [],
      noteSnippets: [],
    });
    expect(prompt).toContain(todayIso);
  });

  it("pre-meeting briefs", () => {
    const prompt = buildBriefPrompt({
      contactName: "Sam",
      title: null,
      company: null,
      sessionNames: [],
      facts: [],
      noteSnippets: [],
      openFollowUps: [],
      lastTouch: "3 months ago",
    });
    expect(prompt).toContain(todayIso);
  });

  it("enrichment", () => {
    const prompt = buildEnrichmentPrompt({
      name: "Sam",
      title: null,
      company: null,
      links: [],
    });
    expect(prompt).toContain(todayIso);
  });

  it("signal detection (job-change + news)", () => {
    const prompt = buildSignalDetectionPrompt(
      { name: "Sam", title: null, company: null },
      [],
    );
    expect(prompt).toContain(todayIso);
  });
});
