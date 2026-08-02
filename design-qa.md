# Design QA — visual feature disclosure

Date: 2026-08-02

## Visual target

- Reference: the deployed, authenticated Dhaga web app at 1280 × 720, including its app navigation, capture flow, Ask palette, follow-up draft, signals, circles, and Sigma graph.
- Goal: replace the text-heavy feature grid with one compact, progressively disclosed product preview while keeping the marketing page recognisably Dhaga.
- Constraint: show only capabilities and controls that the current product actually has; do not imply automatic sending, instant fact extraction, a native phone flow, or a fictitious graph UI.

## Comparison pass

- Compared the deployed homepage and updated homepage together at 1280 × 720 in the same dark state. The typography, app-preview scale, navigation, CTA hierarchy, tokens, and two-column rhythm remain consistent; the new channel rail fits entirely inside the first viewport without creating a new section.
- Compared the deployed graph and the prototype graph together at 1280 × 720. Both use the production AppNav hierarchy, Layers control, graph search, Sigma renderer, typed node colours, and camera controls. The prototype intentionally uses a small deterministic fixture, not a fabricated screenshot of user data.
- Compared the prototype capture, Ask, draft, voice, circles, signals, and warm-path states against the corresponding deployed surfaces and source components. Labels, control order, interaction claims, border treatment, radius, spacing, icon family, and amber action hierarchy follow the real app.
- Removed the fictional macOS titlebar, sidebar, phone shell, avatars, React Flow diagram, and controls that do not exist in production.

## Responsive and interaction pass

- Verified `/features` at 1280 × 720 and 390 × 844 in the in-app browser.
- Verified `/` at 1280 × 720 and 390 × 844 in dark and light modes. The hero names web, WhatsApp, Telegram, and planned MCP capture before the app preview; CTA and channel rail remain visible in the first viewport at both tested sizes.
- WhatsApp and Telegram pills have 44 px targets and open the existing messaging-capture guide. MCP is visually quieter and explicitly labelled `Coming soon`; it is not a clickable or shipped claim.
- The existing three-step journey now says `Capture anywhere` and explains note/card/photo forwarding without adding a new section or scroll depth.
- At 390 px the header collapses to logo, theme, `Join beta`, and menu without horizontal overflow; the hero remains readable with no clipped glyphs.
- Feature selectors form one horizontally snapping row with visible next-item affordance and 44 px minimum targets. Selecting a card brings it into view and replaces the single persistent preview rather than adding vertical content.
- Verified capture and auto-grouping states on mobile. The app crop remains legible, contained, and consistent with the real app's responsive navigation.
- Verified click/tap selection, hover/focus disclosure, and ArrowRight keyboard selection. `aria-selected` updates on the active tab and only one tabpanel is mounted.
- Fresh browser console logs contain no errors or warnings from the implementation.

## Performance and release pass

- `/features` is the compact route; the previous long workflow, Ask demo, graph sandbox, comparison, and FAQ remain reachable on `/product-tour`.
- The Sigma graph is dynamically loaded only for graph and warm-path selections. The default capture preview does not fetch or mount it.
- Production-route reachability reports zero unreachable modules in `components/landing` and `utils/constants/landing`.
- Removed 52 unreachable files and the now-unused `ogl` and `@xyflow/react` dependencies while retaining the reusable production Sigma/search/device patterns.
- Full ESLint completed with zero errors (existing generated/vendor warnings only); TypeScript passed; all 176 Vitest files and 1,043 tests passed; the production build generated 274 static pages including `/features`, `/product-tour`, and `/sitemap.xml`; `llms.txt` regeneration is deterministic; `git diff --check` passed.

## Result

No P0, P1, or P2 visual, responsive, interaction, accessibility, performance, or build defects remain in this scope.

final result: passed
