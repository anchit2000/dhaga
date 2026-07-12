export function activeSessionId(
  sessions: { id: string; startedAt: Date }[],
): string | undefined {
  const today = new Date().toDateString();
  return sessions.find((session) => session.startedAt.toDateString() === today)?.id;
}
