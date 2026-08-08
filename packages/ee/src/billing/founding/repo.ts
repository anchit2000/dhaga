import { count, eq, sql } from "drizzle-orm";
import { foundingSeats } from "../../db/schema";
import { billingDb } from "../repo/connection";
import { FOUNDING_SEAT_CAP } from "./cap";

/** How many seats have been claimed. Reads our own table — never a processor. */
export async function claimedSeatCount(): Promise<number> {
  const [row] = await (await billingDb()).select({ n: count() }).from(foundingSeats);
  return row?.n ?? 0;
}

async function seatFor(userId: string): Promise<number | null> {
  const [row] = await (await billingDb())
    .select({ seatNo: foundingSeats.seatNo })
    .from(foundingSeats)
    .where(eq(foundingSeats.userId, userId));
  return row?.seatNo ?? null;
}

/**
 * Claims the next seat for `userId`, or returns null when they are gone.
 *
 * THE RACE, and how this closes it: two buyers reaching the last seat at the
 * same moment both read "499 claimed" under READ COMMITTED, because neither
 * transaction can see the other's uncommitted row. A `count() < cap` check
 * followed by an insert therefore lets BOTH through, and the offer oversells a
 * number printed on a public page.
 *
 * So the decision is made by the UNIQUE index on `seat_no`, not by the count:
 * both racers compute the same `max(seat_no) + 1`, both try to insert it, and
 * Postgres serialises them on the index — the loser gets zero rows back from
 * ON CONFLICT DO NOTHING and retries with the next number, which is then either
 * free or past the cap. The cap is a WHERE clause on the same statement, so the
 * number and the limit are evaluated together rather than in two steps.
 *
 * Idempotent per user: `user_id` is the primary key, so re-opening checkout
 * returns the seat already held instead of burning another one.
 */
export async function claimFoundingSeat(userId: string): Promise<number | null> {
  const held = await seatFor(userId);
  if (held !== null) return held;

  const conn = await billingDb();
  // Bounded: each iteration either wins a seat, proves the cap is reached, or
  // loses to exactly one other claimer, so a handful of attempts covers far
  // more concurrency than a 500-seat offer will ever see.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const claimed = await conn.execute<{ seat_no: number }>(sql`
      insert into founding_seats (user_id, seat_no)
      select ${userId}, next_seat
      from (select coalesce(max(seat_no), 0) + 1 as next_seat from founding_seats) s
      where s.next_seat <= ${FOUNDING_SEAT_CAP}
      on conflict do nothing
      returning seat_no
    `);
    const seatNo = claimed.rows[0]?.seat_no;
    if (seatNo !== undefined) return seatNo;
    // Nothing inserted: either the seats ran out, or this user already has one
    // (a double-clicked button racing itself), or another buyer took the number.
    if ((await claimedSeatCount()) >= FOUNDING_SEAT_CAP) return null;
    const own = await seatFor(userId);
    if (own !== null) return own;
  }
  // Losing five consecutive races on a 500-seat offer is not a state to paper
  // over with a silent fallback to standard Pro — surface it.
  throw new Error("Couldn't claim a founding seat right now. Please try again.");
}
