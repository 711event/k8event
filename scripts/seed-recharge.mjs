// Manually insert a daily_recharge row for testing eligibility.
// Usage: node --env-file=.env.local scripts/seed-recharge.mjs <username> <amount> [yyyy-mm-dd]
import { createClient } from "@supabase/supabase-js";
import { env } from "./_env.mjs";

const [, , username, amountArg, dateArg] = process.argv;
if (!username || !amountArg) {
  console.error("usage: node --env-file=.env.local scripts/seed-recharge.mjs <username> <amount> [yyyy-mm-dd-GMT+8]");
  process.exit(2);
}

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE = env("SUPABASE_SERVICE_ROLE_KEY");

function todayMalaysia() {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60_000;
  const sgt = new Date(utc + 8 * 3600_000);
  return sgt.toISOString().slice(0, 10);
}

const date = dateArg ?? todayMalaysia();
const amount = Number(amountArg);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profile, error: profErr } = await admin
  .from("profiles")
  .select("user_id, display_name")
  .eq("username", username)
  .maybeSingle();

if (profErr || !profile) {
  console.error("profile not found:", profErr?.message ?? username);
  process.exit(1);
}

const { error: upErr } = await admin
  .from("daily_recharge")
  .upsert(
    { player_id: profile.user_id, recharge_date: date, amount, source: "manual" },
    { onConflict: "player_id,recharge_date" },
  );

if (upErr) {
  console.error("upsert failed:", upErr.message);
  process.exit(1);
}

console.log(`✓ ${username} (${profile.display_name}) recharged ${amount} on ${date}`);
