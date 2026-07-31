/** "1 credit" / "3 credits" — the unit is always spelled out next to the number,
 *  because a bare integer beside an action name reads as a count of actions. */
export function creditsLabel(credits: number): string {
  return `${credits} ${credits === 1 ? "credit" : "credits"}`;
}
