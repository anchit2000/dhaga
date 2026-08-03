import Link from "next/link";
import type { ReactElement } from "react";
import { Blocks } from "lucide-react";
import { CopyCommand } from "@/components/ui/copy-command";
import {
  MCP_DOCS_PATH,
  MCP_ENDPOINT_URL,
  SKILLS_INSTALL_COMMAND,
} from "@/utils/constants/skills";

/**
 * Connecting an outside assistant to this graph over MCP.
 *
 * Sits directly above the personal access tokens card because the two halves
 * belong together: a local client needs a token from below, and a hosted one
 * (claude.ai, ChatGPT) needs nothing but the endpoint. Nothing here is
 * user-specific, so it renders on the server with no query behind it.
 */
export function ConnectAssistantSetting(): ReactElement {
  return (
    <div className="space-y-4 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-paper">
          <Blocks className="size-4 text-magic" aria-hidden="true" />
          Connect your AI assistant
        </p>
        <p className="mt-1 text-sm text-fog">
          Let an assistant you already use — Claude, Cursor, ChatGPT — read your network
          and write back to it. Reading costs no AI credits.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fog">
            1 · Install the skills
          </p>
          <p className="mt-1.5 text-sm text-fog">
            Teaches the assistant how to use Dhaga well — search before it needs a contact,
            cite the note a fact came from, never invent a connection. Optional, but it is
            the difference between a connected assistant and a useful one.
          </p>
          <CopyCommand
            command={SKILLS_INSTALL_COMMAND}
            label="skills install command"
            className="mt-2"
          />
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-fog">
            2 · Connect your account
          </p>
          <p className="mt-1.5 text-sm text-fog">
            Add this endpoint as a custom connector in claude.ai or ChatGPT and log in as
            usual — no token to copy. A local client like Claude Code or Cursor uses a
            personal access token from the card below instead.
          </p>
          <CopyCommand command={MCP_ENDPOINT_URL} label="MCP endpoint" className="mt-2" />
        </div>
      </div>

      <p className="text-sm text-fog">
        <Link
          href={MCP_DOCS_PATH}
          className="text-ember underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust/40"
        >
          Set up a client, step by step
        </Link>
      </p>
    </div>
  );
}
