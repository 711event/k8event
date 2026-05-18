// Run a SQL migration against the Supabase project's Postgres database directly.
// Usage: node --env-file=.env.local scripts/run-migration.mjs <path-to-sql-file>
// Defaults to supabase/migrations/0001_init.sql.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import { env } from "./_env.mjs";

const file = process.argv[2] ?? "supabase/migrations/0001_init.sql";
const sqlPath = resolve(process.cwd(), file);
const ref = env("SUPABASE_PROJECT_REF");
const password = env("SUPABASE_DB_PASSWORD");
const poolerHost = env("SUPABASE_POOLER_HOST");

// Supavisor pooler in *session* mode (port 5432) — supports DDL and IPv4.
const connStr = `postgresql://postgres.${ref}:${password}@${poolerHost}:5432/postgres`;

const sql = postgres(connStr, { prepare: false, max: 1 });

const content = readFileSync(sqlPath, "utf8");
console.log(`Running ${file} (${content.length} bytes) against ${ref}...`);

try {
  await sql.unsafe(content);
  console.log("✓ Migration applied successfully.");
} catch (err) {
  console.error("✗ Migration failed:");
  console.error(err.message);
  if (err.position) console.error("Position:", err.position);
  if (err.where) console.error("Where:", err.where);
  process.exitCode = 1;
} finally {
  await sql.end();
}
