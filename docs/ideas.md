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
