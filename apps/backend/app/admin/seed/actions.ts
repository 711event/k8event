"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";
import { malaysiaToUtc } from "@k8event/shared/time/malaysia";

// ─────────────────────────────────────────────
// Actual 48 FIFA World Cup 2026 teams
// flag: https://flagcdn.com/w80/{alpha2}.png
// Source: worldcupkickofftimes.com/schedule/sgt
// ─────────────────────────────────────────────
const WC_TEAMS: { name: string; short_code: string; flag: string }[] = [
  // Group A
  { name: "Mexico",                   short_code: "MEX", flag: "mx" },
  { name: "South Africa",             short_code: "RSA", flag: "za" },
  { name: "South Korea",              short_code: "KOR", flag: "kr" },
  { name: "Czechia",                  short_code: "CZE", flag: "cz" },
  // Group B
  { name: "Canada",                   short_code: "CAN", flag: "ca" },
  { name: "Qatar",                    short_code: "QAT", flag: "qa" },
  { name: "Switzerland",              short_code: "SUI", flag: "ch" },
  { name: "Bosnia and Herzegovina",   short_code: "BIH", flag: "ba" },
  // Group C
  { name: "Haiti",                    short_code: "HAI", flag: "ht" },
  { name: "Scotland",                 short_code: "SCO", flag: "gb-sct" },
  { name: "Brazil",                   short_code: "BRA", flag: "br" },
  { name: "Morocco",                  short_code: "MAR", flag: "ma" },
  // Group D
  { name: "United States",            short_code: "USA", flag: "us" },
  { name: "Paraguay",                 short_code: "PAR", flag: "py" },
  { name: "Australia",                short_code: "AUS", flag: "au" },
  { name: "Türkiye",                  short_code: "TUR", flag: "tr" },
  // Group E
  { name: "Ivory Coast",              short_code: "CIV", flag: "ci" },
  { name: "Germany",                  short_code: "GER", flag: "de" },
  { name: "Curaçao",                  short_code: "CUW", flag: "cw" },
  { name: "Ecuador",                  short_code: "ECU", flag: "ec" },
  // Group F
  { name: "Netherlands",              short_code: "NED", flag: "nl" },
  { name: "Japan",                    short_code: "JPN", flag: "jp" },
  { name: "Sweden",                   short_code: "SWE", flag: "se" },
  { name: "Tunisia",                  short_code: "TUN", flag: "tn" },
  // Group G
  { name: "Belgium",                  short_code: "BEL", flag: "be" },
  { name: "Iran",                     short_code: "IRN", flag: "ir" },
  { name: "New Zealand",              short_code: "NZL", flag: "nz" },
  { name: "Egypt",                    short_code: "EGY", flag: "eg" },
  // Group H
  { name: "Saudi Arabia",             short_code: "KSA", flag: "sa" },
  { name: "Spain",                    short_code: "ESP", flag: "es" },
  { name: "Uruguay",                  short_code: "URU", flag: "uy" },
  { name: "Cape Verde",               short_code: "CPV", flag: "cv" },
  // Group I
  { name: "France",                   short_code: "FRA", flag: "fr" },
  { name: "Iraq",                     short_code: "IRQ", flag: "iq" },
  { name: "Norway",                   short_code: "NOR", flag: "no" },
  { name: "Senegal",                  short_code: "SEN", flag: "sn" },
  // Group J
  { name: "Argentina",                short_code: "ARG", flag: "ar" },
  { name: "Austria",                  short_code: "AUT", flag: "at" },
  { name: "Jordan",                   short_code: "JOR", flag: "jo" },
  { name: "Algeria",                  short_code: "ALG", flag: "dz" },
  // Group K
  { name: "Portugal",                 short_code: "POR", flag: "pt" },
  { name: "Uzbekistan",               short_code: "UZB", flag: "uz" },
  { name: "Colombia",                 short_code: "COL", flag: "co" },
  { name: "DR Congo",                 short_code: "COD", flag: "cd" },
  // Group L
  { name: "Ghana",                    short_code: "GHA", flag: "gh" },
  { name: "Panama",                   short_code: "PAN", flag: "pa" },
  { name: "England",                  short_code: "ENG", flag: "gb-eng" },
  { name: "Croatia",                  short_code: "CRO", flag: "hr" },
];

// ─────────────────────────────────────────────
// Actual 72-match Group Stage schedule (SGT = GMT+8)
// Source: worldcupkickofftimes.com/schedule/sgt
// ─────────────────────────────────────────────
const SCHEDULE: { home: string; away: string; kickoff: string }[] = [
  // ── Matchday 1 ──────────────────────────────────────────────────────
  { home: "Mexico",                   away: "South Africa",           kickoff: "2026-06-12T03:00" },
  { home: "South Korea",              away: "Czechia",                kickoff: "2026-06-12T10:00" },
  { home: "Canada",                   away: "Bosnia and Herzegovina", kickoff: "2026-06-13T03:00" },
  { home: "United States",            away: "Paraguay",               kickoff: "2026-06-13T09:00" },
  { home: "Qatar",                    away: "Switzerland",            kickoff: "2026-06-14T03:00" },
  { home: "Brazil",                   away: "Morocco",                kickoff: "2026-06-14T06:00" },
  { home: "Haiti",                    away: "Scotland",               kickoff: "2026-06-14T09:00" },
  { home: "Australia",                away: "Türkiye",                kickoff: "2026-06-14T12:00" },
  { home: "Germany",                  away: "Curaçao",                kickoff: "2026-06-15T01:00" },
  { home: "Netherlands",              away: "Japan",                  kickoff: "2026-06-15T04:00" },
  { home: "Ivory Coast",              away: "Ecuador",                kickoff: "2026-06-15T07:00" },
  { home: "Sweden",                   away: "Tunisia",                kickoff: "2026-06-15T10:00" },
  { home: "Spain",                    away: "Cape Verde",             kickoff: "2026-06-16T00:00" },
  { home: "Belgium",                  away: "Egypt",                  kickoff: "2026-06-16T03:00" },
  { home: "Saudi Arabia",             away: "Uruguay",                kickoff: "2026-06-16T06:00" },
  { home: "Iran",                     away: "New Zealand",            kickoff: "2026-06-16T09:00" },
  { home: "France",                   away: "Senegal",                kickoff: "2026-06-17T03:00" },
  { home: "Iraq",                     away: "Norway",                 kickoff: "2026-06-17T06:00" },
  { home: "Argentina",                away: "Algeria",                kickoff: "2026-06-17T09:00" },
  { home: "Austria",                  away: "Jordan",                 kickoff: "2026-06-17T12:00" },
  { home: "Portugal",                 away: "DR Congo",               kickoff: "2026-06-18T01:00" },
  { home: "Ghana",                    away: "Panama",                 kickoff: "2026-06-18T04:00" },
  { home: "England",                  away: "Croatia",                kickoff: "2026-06-18T04:00" },
  { home: "Uzbekistan",               away: "Colombia",               kickoff: "2026-06-18T10:00" },
  // ── Matchday 2 ──────────────────────────────────────────────────────
  { home: "Czechia",                  away: "South Africa",           kickoff: "2026-06-19T00:00" },
  { home: "Switzerland",              away: "Bosnia and Herzegovina", kickoff: "2026-06-19T03:00" },
  { home: "Canada",                   away: "Qatar",                  kickoff: "2026-06-19T06:00" },
  { home: "Mexico",                   away: "South Korea",            kickoff: "2026-06-19T11:00" },
  { home: "United States",            away: "Australia",              kickoff: "2026-06-20T03:00" },
  { home: "Scotland",                 away: "Morocco",                kickoff: "2026-06-20T06:00" },
  { home: "Brazil",                   away: "Haiti",                  kickoff: "2026-06-20T09:00" },
  { home: "Türkiye",                  away: "Paraguay",               kickoff: "2026-06-20T11:00" },
  { home: "Netherlands",              away: "Sweden",                 kickoff: "2026-06-21T01:00" },
  { home: "Germany",                  away: "Ivory Coast",            kickoff: "2026-06-21T04:00" },
  { home: "Ecuador",                  away: "Curaçao",                kickoff: "2026-06-21T08:00" },
  { home: "Tunisia",                  away: "Japan",                  kickoff: "2026-06-21T12:00" },
  { home: "Spain",                    away: "Saudi Arabia",           kickoff: "2026-06-22T00:00" },
  { home: "Uruguay",                  away: "Cape Verde",             kickoff: "2026-06-22T06:00" },
  { home: "Belgium",                  away: "Iran",                   kickoff: "2026-06-22T06:00" },
  { home: "New Zealand",              away: "Egypt",                  kickoff: "2026-06-22T09:00" },
  { home: "Argentina",                away: "Austria",                kickoff: "2026-06-23T01:00" },
  { home: "France",                   away: "Iraq",                   kickoff: "2026-06-23T05:00" },
  { home: "Norway",                   away: "Senegal",                kickoff: "2026-06-23T08:00" },
  { home: "Jordan",                   away: "Algeria",                kickoff: "2026-06-23T11:00" },
  { home: "Portugal",                 away: "Uzbekistan",             kickoff: "2026-06-24T01:00" },
  { home: "England",                  away: "Ghana",                  kickoff: "2026-06-24T04:00" },
  { home: "Panama",                   away: "Croatia",                kickoff: "2026-06-24T07:00" },
  { home: "Colombia",                 away: "DR Congo",               kickoff: "2026-06-24T10:00" },
  // ── Matchday 3 (simultaneous within each group) ─────────────────────
  { home: "Switzerland",              away: "Canada",                 kickoff: "2026-06-25T03:00" },
  { home: "Bosnia and Herzegovina",   away: "Qatar",                  kickoff: "2026-06-25T03:00" },
  { home: "Scotland",                 away: "Brazil",                 kickoff: "2026-06-25T06:00" },
  { home: "Morocco",                  away: "Haiti",                  kickoff: "2026-06-25T06:00" },
  { home: "Czechia",                  away: "Mexico",                 kickoff: "2026-06-25T11:00" },
  { home: "South Africa",             away: "South Korea",            kickoff: "2026-06-25T11:00" },
  { home: "Curaçao",                  away: "Ivory Coast",            kickoff: "2026-06-26T04:00" },
  { home: "Ecuador",                  away: "Germany",                kickoff: "2026-06-26T04:00" },
  { home: "Japan",                    away: "Sweden",                 kickoff: "2026-06-26T07:00" },
  { home: "Tunisia",                  away: "Netherlands",            kickoff: "2026-06-26T07:00" },
  { home: "Türkiye",                  away: "United States",          kickoff: "2026-06-26T10:00" },
  { home: "Paraguay",                 away: "Australia",              kickoff: "2026-06-26T10:00" },
  { home: "Norway",                   away: "France",                 kickoff: "2026-06-27T03:00" },
  { home: "Senegal",                  away: "Iraq",                   kickoff: "2026-06-27T03:00" },
  { home: "Cape Verde",               away: "Saudi Arabia",           kickoff: "2026-06-27T06:00" },
  { home: "Uruguay",                  away: "Spain",                  kickoff: "2026-06-27T08:00" },
  { home: "Egypt",                    away: "Iran",                   kickoff: "2026-06-27T11:00" },
  { home: "New Zealand",              away: "Belgium",                kickoff: "2026-06-27T11:00" },
  { home: "Panama",                   away: "England",                kickoff: "2026-06-28T05:00" },
  { home: "Croatia",                  away: "Ghana",                  kickoff: "2026-06-28T05:00" },
  { home: "Colombia",                 away: "Portugal",               kickoff: "2026-06-28T07:30" },
  { home: "DR Congo",                 away: "Uzbekistan",             kickoff: "2026-06-28T07:30" },
  { home: "Algeria",                  away: "Austria",                kickoff: "2026-06-28T10:00" },
  { home: "Jordan",                   away: "Argentina",              kickoff: "2026-06-28T10:00" },
];

// ─────────────────────────────────────────────
// Return type
// ─────────────────────────────────────────────
export type SeedResult =
  | { ok: true; inserted: number; skipped: number }
  | { error: string };

// ─────────────────────────────────────────────
// Action 1a: Add missing WC teams (skip existing by name)
// ─────────────────────────────────────────────
export async function seedTeamsAction(): Promise<SeedResult> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase.from("teams").select("name");
  const existingNames = new Set((existing ?? []).map((t) => t.name));

  const toInsert = WC_TEAMS.filter((t) => !existingNames.has(t.name)).map((t) => ({
    name: t.name,
    short_code: t.short_code,
    logo_url: `https://flagcdn.com/w80/${t.flag}.png`,
  }));

  const skipped = WC_TEAMS.length - toInsert.length;

  if (toInsert.length === 0) {
    return { ok: true, inserted: 0, skipped };
  }

  const { error } = await supabase.from("teams").insert(toInsert);
  if (error) return { error: error.message };

  revalidatePath("/admin/teams");
  revalidatePath("/admin/matches");
  return { ok: true, inserted: toInsert.length, skipped };
}

// ─────────────────────────────────────────────
// Action 1b: RESET — delete ALL teams then re-insert 48 correct ones
// Requires all matches to be cleared first.
// ─────────────────────────────────────────────
export async function resetAndSeedTeamsAction(): Promise<SeedResult> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  // Safety: require matches to be cleared first
  const { count: matchCount } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true });
  if ((matchCount ?? 0) > 0) {
    return { error: `还有 ${matchCount} 场比赛存在，请先清除所有比赛再重置球队数据。` };
  }

  // Delete all existing teams
  const { error: delErr } = await supabase
    .from("teams")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // deletes all rows
  if (delErr) return { error: delErr.message };

  // Insert correct 48 teams
  const toInsert = WC_TEAMS.map((t) => ({
    name: t.name,
    short_code: t.short_code,
    logo_url: `https://flagcdn.com/w80/${t.flag}.png`,
  }));

  const { error } = await supabase.from("teams").insert(toInsert);
  if (error) return { error: error.message };

  revalidatePath("/admin/teams");
  revalidatePath("/admin/matches");
  return { ok: true, inserted: toInsert.length, skipped: 0 };
}

// ─────────────────────────────────────────────
// Action 2: Generate 72 group-stage matches from actual schedule
// ─────────────────────────────────────────────
export async function seedMatchesAction(): Promise<SeedResult> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  // Idempotency guard
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("status", "scheduled");

  if ((count ?? 0) >= 10) {
    return {
      error: `已有 ${count} 场 scheduled 赛程。请先点 "清除已排期比赛" 再重新生成。`,
    };
  }

  // Load team IDs by name
  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, name");
  if (teamsErr || !teams) return { error: "无法获取队伍数据" };

  const nameToId = new Map(teams.map((t) => [t.name, t.id]));

  // Verify all 48 required teams exist
  const missing: string[] = [];
  for (const { home, away } of SCHEDULE) {
    if (!nameToId.has(home)) missing.push(home);
    if (!nameToId.has(away)) missing.push(away);
  }
  const uniqueMissing = [...new Set(missing)];
  if (uniqueMissing.length > 0) {
    return {
      error: `缺少以下队伍，请先点 "重置球队数据"：${uniqueMissing.slice(0, 5).join("、")}${uniqueMissing.length > 5 ? `…（共 ${uniqueMissing.length} 支）` : ""}`,
    };
  }

  // Build match rows from actual schedule
  const rows = SCHEDULE.map(({ home, away, kickoff }) => ({
    home_team_id: nameToId.get(home)!,
    away_team_id: nameToId.get(away)!,
    kickoff_at: malaysiaToUtc(kickoff).toISOString(),
    token_reward: 10,
    status: "scheduled" as const,
  }));

  const { error } = await supabase.from("matches").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/admin/matches");
  revalidatePath("/matches");
  return { ok: true, inserted: rows.length, skipped: 0 };
}

// ─────────────────────────────────────────────
// Action 3: Clear all scheduled matches (reset)
// ─────────────────────────────────────────────
export async function resetSeedMatchesAction(): Promise<SeedResult> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("status", "scheduled");

  const { error } = await supabase.from("matches").delete().eq("status", "scheduled");
  if (error) return { error: error.message };

  revalidatePath("/admin/matches");
  revalidatePath("/matches");
  return { ok: true, inserted: 0, skipped: count ?? 0 };
}
