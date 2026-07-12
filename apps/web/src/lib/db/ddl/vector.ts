/** Schema owned by the built-in pgvector VectorStore. */
export const VECTOR_DDL = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings (
  owner_type text NOT NULL,
  owner_id text NOT NULL,
  contact_id text NOT NULL,
  content text NOT NULL,
  embedding vector(384) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_type, owner_id)
);
`;
