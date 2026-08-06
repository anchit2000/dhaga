# Codex guidance

Read and follow `CLAUDE.md` completely before changing this repository; it is
the repo-wide source of truth for architecture, privacy, code style, testing,
documentation, and the one-branch/one-PR workflow.

- Start each change from fresh `origin/main`; never commit directly to `main`.
- Keep changes surgical, update affected documentation in the same PR, and
  report skipped or unverified checks explicitly.
- For web work, also follow `apps/web/AGENTS.md`; for mobile work, follow
  `apps/mobile/AGENTS.md`.
- Run the checks relevant to every touched workspace, plus browser verification
  and light/dark 375px visual QA for UI changes.
- Never run destructive commands against the Supabase database described in
  `CLAUDE.md`, including against rows that look like test data.

Repository skills already live under `.agents/skills`; use a matching skill
when its description applies rather than duplicating its workflow here.
Review and trust changed project hooks through Codex's `/hooks` screen; Codex
correctly skips unreviewed repository commands.
