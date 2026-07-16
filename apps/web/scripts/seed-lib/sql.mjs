/**
 * Batched multi-row INSERT helpers, shared by the seeder's create path.
 * Chunk size keeps each statement well under Postgres' 65535-parameter cap
 * (widest row here is 12 columns → 6000 params per batch).
 */

const BATCH_SIZE = 500;

export function chunk(rows, size = BATCH_SIZE) {
  const chunks = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}

/**
 * Builds a `($1,$2::jsonb,...),($n,...)` multi-row VALUES clause. `casts` is
 * parallel to each row's columns — "" for none, "::jsonb" etc. where needed.
 */
export function buildValuesClause(rowsOfValues, casts = []) {
  const params = [];
  const tuples = rowsOfValues.map((row) => {
    const placeholders = row.map((value, i) => {
      params.push(value);
      return `$${params.length}${casts[i] ?? ""}`;
    });
    return `(${placeholders.join(",")})`;
  });
  return { sql: tuples.join(","), params };
}

/** Inserts all `rows` into `table` in batches; returns the row count. */
export async function insertRows(client, table, columns, rows, casts = []) {
  for (const batch of chunk(rows)) {
    const { sql, params } = buildValuesClause(batch, casts);
    await client.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ${sql}`, params);
  }
  return rows.length;
}
