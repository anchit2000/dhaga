1. Keith Ferrazzi ideas from book
2. Document scanners like cropping
3. One stop chat interface whatsapp/telegram -- Anchit loves Linkin Park
4. Graph seeding / cold-start imports (2026-07-04): Google Contacts (People API
   OAuth, one click — lower friction than LinkedIn CSV) + on-device contacts
   (expo-contacts, mobile milestone) + LinkedIn CSV for power users. iOS/Android
   contact records already carry company + job-title fields → graph has mass on
   day one, user annotates from there. Clustering suggestions, never auto-edges:
   shared surname → community candidates ("all Jains together"), shared tokens
   embedded in saved names ("Anchit JOGET", "Arjit JOGET" → company Joget).
   Token-frequency code does the grouping (Rule 5 — no LLM for deterministic
   work); Haiku only to label ambiguous clusters. A suggestion becomes an edge
   only on user confirmation — an unconfirmed guess has no receipt.
5. scroll-zoom timeline page (2026-07-04): — a scroll-driven constellation/particle visual that
   zooms through milestone counters ("relationships captured," "notes
   transcribed," "follow-ups drafted") year by year. Do NOT build with
   placeholder/fabricated numbers — Dhaga is pre-launch with no real usage
   data yet, and faking stats like "700,705 relationships entrusted" cuts
   against the product's honesty/privacy-first positioning. Revisit once
   there's real post-launch usage data to visualize; use the amber/ink
   palette, not a literal blue starfield.
6. grid with a hover-tilt "opens a little" effect (see `TiltCard.tsx` in
   `apps/web/src/components/landing/`, already built for pricing/how-it-works
   cards — reuse it here). Worth building once there's enough docs/support
   content to warrant a dedicated page rather than just the landing FAQ.
7. Expand `CaptureOrbit` (apps/web/src/components/landing/CaptureOrbit.tsx —
   currently 4 capture-source icons orbiting the hero) into a full
   integrations section once real third-party integrations ship (e.g.
   Google Contacts, LinkedIn CSV, calendar sync from idea #4 above) — orbit
   real integration logos instead of generic capture-method glyphs.
