"use client";

import { unstable_isUnrecognizedActionError } from "next/navigation";

/** What the user is told when their tab is older than the server. Deliberately
 *  names the cause: "couldn't update, try again" sent someone to the Vercel logs
 *  to find out that retrying could never work. */
export const STALE_DEPLOYMENT_MESSAGE =
  "A new version of Dhaga was released — refresh the page to continue.";

/**
 * True when a server action failed *only* because this tab is running an older
 * deployment than the server: after a deploy, the ids baked into the loaded
 * client bundle no longer exist in the new build, so the POST 404s before the
 * action runs ("Failed to find Server Action …" in the server logs).
 *
 * Nothing was written and nothing is wrong with the data — the fix is a reload,
 * never a retry, so callers must NOT show their usual "try again" toast. Uses
 * Next's own marker (the 404 carries an action-not-found header that the client
 * router turns into `UnrecognizedActionError`) rather than matching on a message
 * string, which is redacted in production builds.
 */
export function isStaleDeploymentError(error: unknown): boolean {
  return unstable_isUnrecognizedActionError(error);
}
