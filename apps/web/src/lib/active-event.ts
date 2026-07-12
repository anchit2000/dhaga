export function activeEventId(
  events: { id: string; startedAt: Date }[],
): string | undefined {
  const today = new Date().toDateString();
  return events.find((event) => event.startedAt.toDateString() === today)?.id;
}
