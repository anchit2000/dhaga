import { SITE_URL } from "@/utils/constants/site";

// Dhaga publishes agent skills at the well-known location the `skills` CLI
// reads, so both commands below are derived from the instance origin rather
// than hardcoded: a self-hoster who sets NEXT_PUBLIC_SITE_URL gets install
// instructions that point at their own host, which is the only host their
// tokens and OAuth grants are valid for.

/** Installs the skills published under `/.well-known/skills/`. */
export const SKILLS_INSTALL_COMMAND = `npx skills add ${SITE_URL}`;

/** The MCP endpoint a client connects to — pasted into a connector as-is. */
export const MCP_ENDPOINT_URL = `${SITE_URL}/api/mcp`;

/** Adds this instance to Claude Code with a personal access token. */
export const MCP_CLAUDE_CODE_COMMAND = `claude mcp add --transport http dhaga ${MCP_ENDPOINT_URL} --header "x-api-key: YOUR_TOKEN"`;

/** User guide for connecting a client and installing the skills. */
export const MCP_DOCS_PATH = "/docs/guide/mcp";
