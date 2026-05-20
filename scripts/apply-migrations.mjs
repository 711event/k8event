/**
 * Apply pending migrations (0005, 0006, 0007) to Supabase.
 * Run: node --env-file=.env.local scripts/apply-migrations.mjs
 *
 * Requires: npm install pg (run once)
 */
import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const projectRef = process.env.SUPABASE_PROJECT_REF;
const password = process.env.SUPABASE_DB_PASSWORD;
const poolerHost = process.env.SUPABASE_POOLER_HOST;

if (!projectRef || !password || !poolerHost) {
  console.error("Missing SUPABASE_PROJECT_REF, SUPABASE_DB_PASSWORD, or SUPABASE_POOLER_HOST in .env.local");
  process.exit(1);
}

const client = new Client({
  host: poolerHost,
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password: password,
  ssl: { rejectUnauthorized: false },
});

const migrations = [
  "0005_activities.sql",
  "0006_token_sources.sql",
  "0007_checkin.sql",
  "0008_chat_player.sql",
  "0009_chat_thread_preview.sql",
  "0010_fix_chat_rls.sql",
  "0011_fix_auth_role_secdef.sql",
  "0012_chat_urgency_thresholds.sql",
];

console.log(`Connecting to Supabase project ${projectRef}...`);
await client.connect();
console.log("Connected.\n");

// Files with dollar-quoted function bodies — run as a single query
const SINGLE_QUERY_FILES = new Set(["0007_checkin.sql", "0009_chat_thread_preview.sql"]);

for (const file of migrations) {
  const sql = readFileSync(join(__dirname, "../supabase/migrations", file), "utf8");
  console.log(`Applying ${file}...`);

  if (SINGLE_QUERY_FILES.has(file)) {
    // Run entire file as one query (contains $$-quoted function bodies)
    try {
      await client.query(sql);
      console.log(`  ✓ ${file} applied`);
    } catch (err) {
      if (
        err.message?.includes("already exists") ||
        err.message?.includes("duplicate key value")
      ) {
        console.log(`  ⚠ skipped (already exists): ${err.message.slice(0, 100)}`);
      } else {
        console.error(`  ✗ ${file} FAILED: ${err.message}`);
        throw err;
      }
    }
    continue;
  }

  // For other files: split on statement boundaries.
  // ALTER TYPE … ADD VALUE must be committed before the new value can be used.
  const statements = sql
    .split(/;(\s*\n)/)
    .map((s) => s.trim())
    .filter(Boolean);

  let failed = false;
  for (const stmt of statements) {
    try {
      await client.query(stmt);
    } catch (err) {
      if (
        err.message?.includes("already exists") ||
        err.message?.includes("already been added") ||
        err.message?.includes("duplicate key value")
      ) {
        console.log(`  ⚠ skipped (already exists): ${err.message.slice(0, 80)}`);
      } else {
        console.error(`  ✗ ${file} FAILED on statement:\n    ${stmt.slice(0, 120)}\n  Error: ${err.message}`);
        failed = true;
        break;
      }
    }
  }
  if (!failed) console.log(`  ✓ ${file} applied`);
  if (failed) throw new Error(`Migration ${file} failed`);
}

await client.end();
console.log("\nAll done!");
