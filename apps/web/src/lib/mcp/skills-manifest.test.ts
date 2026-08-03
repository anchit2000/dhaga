import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

/**
 * Dhaga publishes installable agent skills at `/.well-known/skills/`, so a user
 * runs `npx skills add https://www.dhaga.app` and their client learns how to
 * drive the MCP tools well.
 *
 * The CLI reads `index.json` first and then fetches every path it lists,
 * verbatim. That makes the manifest a contract with software we do not control,
 * and both directions of drift fail silently for us and loudly for the user:
 * a file listed but not on disk 404s mid-install, and a file on disk but not
 * listed is simply never shipped — the skill installs missing the reference it
 * tells the model to read. These tests exist so the manifest cannot rot away
 * from the files while the app still builds and deploys fine.
 */

const SKILLS_DIR = fileURLToPath(new URL("../../../public/.well-known/skills", import.meta.url));

interface ManifestSkill {
  name: string;
  description: string;
  files: string[];
}

const manifest: { skills: ManifestSkill[] } = JSON.parse(
  readFileSync(join(SKILLS_DIR, "index.json"), "utf8"),
);

/** Every file under a skill directory, as forward-slash paths relative to it. */
function filesOnDisk(skill: string): string[] {
  const walk = (dir: string, prefix: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(join(dir, entry.name), `${prefix}${entry.name}/`)
        : [`${prefix}${entry.name}`],
    );
  return walk(join(SKILLS_DIR, skill), "").sort();
}

function frontmatter(skill: string): Record<string, unknown> {
  const source = readFileSync(join(SKILLS_DIR, skill, "SKILL.md"), "utf8");
  const [, block] = source.split(/^---$/m);
  return parse(block) as Record<string, unknown>;
}

const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

describe("published skills manifest", () => {
  it("lists every skill directory that is on disk", () => {
    // A skill we forgot to list is a skill nobody can install.
    expect(manifest.skills.map((skill) => skill.name).sort()).toEqual(skillDirs);
  });

  it.each(manifest.skills)("$name ships exactly the files it lists", ({ name, files }) => {
    // Both directions: a listed-but-absent file 404s the install, an
    // unlisted-but-present one never reaches the user's machine.
    expect([...files].sort()).toEqual(filesOnDisk(name));
  });

  it.each(manifest.skills)("$name leads with SKILL.md", ({ files }) => {
    // The CLI treats SKILL.md as the skill itself; references hang off it.
    expect(files[0]).toBe("SKILL.md");
  });

  it.each(manifest.skills)("$name matches its own frontmatter", ({ name, description }) => {
    // The name is the install directory and the description is what the client
    // matches a user's request against — a stale copy here means the skill
    // either lands under the wrong name or never triggers.
    const meta = frontmatter(name);
    expect(meta.name).toBe(name);
    expect(meta.description).toBe(description);
  });
});
