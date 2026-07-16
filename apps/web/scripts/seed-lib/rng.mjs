/**
 * Deterministic randomness for the seeder: a mulberry32 PRNG plus the small
 * sampling helpers every builder shares. One stream per run — thread `rng`
 * through everything (ids included), never Math.random(), so a given --seed
 * reproduces the exact same network.
 */

export function createRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng = {
    float: next,
    /** Integer in [min, max], both inclusive. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(probability) {
      return next() < probability;
    },
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    shuffle(items) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      return items;
    },
    /** Up to `n` distinct items (fewer when the pool is smaller). */
    sample(items, n) {
      return rng.shuffle([...items]).slice(0, n);
    },
    /** UUID-v4-shaped id drawn from the stream, so recreates are reproducible. */
    uuid() {
      let out = "";
      for (const ch of "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx") {
        if (ch === "x") out += Math.floor(next() * 16).toString(16);
        else if (ch === "y") out += ((Math.floor(next() * 4) & 3) | 8).toString(16);
        else out += ch;
      }
      return out;
    },
    /** Deterministic Date in [start, end). */
    date(start, end) {
      return new Date(start.getTime() + next() * (end.getTime() - start.getTime()));
    },
  };
  return rng;
}
