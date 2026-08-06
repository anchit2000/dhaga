export function evaluateStop(payload, ops) {
  const cwd = payload.cwd || process.cwd();
  let root;
  try {
    root = ops.root(cwd);
  } catch {
    return null;
  }
  const branch = ops.git(root, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
  if (!branch || branch === "main" || branch === "master" || branch === "HEAD") return null;
  const parts = [];
  if (ops.git(root, ["status", "--porcelain"]).trim()) parts.push("uncommitted changes");
  try {
    const ahead = Number(ops.git(root, ["rev-list", "--count", "@{u}..HEAD"]).trim());
    if (ahead > 0) parts.push(`${ahead} unpushed commit(s)`);
  } catch {
    parts.push("no upstream (never pushed)");
  }
  if (!parts.length) return null;
  return {
    systemMessage: `Branch '${branch}' has ${parts.join(" + ")}. Before wrapping up: verify, update docs, commit, push, and open or update the PR.`,
  };
}
