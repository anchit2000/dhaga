import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NotFoundContent } from "@/components/app/NotFoundContent";

describe("personalized not-found recovery", () => {
  it("keeps the shopkeeper's message in HTML and offers safe exits", () => {
    const html = renderToStaticMarkup(createElement(NotFoundContent));

    expect(html).toContain("Sorry, I can’t find it yet. Maybe it’s still being woven?");
    expect(html).toContain('href="/app"');
    expect(html).toContain('href="/"');
    expect(html).toContain('aria-label="Page recovery"');
  });
});
