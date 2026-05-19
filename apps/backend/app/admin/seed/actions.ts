"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";
import { malaysiaToUtc } from "@k8event/shared/time/malaysia";

// ─────────────────────────────────────────────
// 48 World Cup 2026 teams
// flag: https://flagcdn.com/w80/{alpha2}.png
// ─────────────────────────────────────────────
const WC_TEAMS: { name: string; short_code: string; flag: string }[] = [
  // UEFA (16)
  { name: "Germany",      short_code: "GER", flag: "de" },
  { name: "Spain",        short_code: "ESP", flag: "es" },
  { name: "France",       short_code: "FRA", flag: "fr" },
  { name: "England",      short_code: "ENG", flag: "gb-eng" },
  { name: "Portugal",     short_code: "POR", flag: "pt" },
  { name: "Netherlands",  short_code: "NED", flag: "nl" },
  { name: "Belgium",      short_code: "BEL", flag: "be" },
  { name: "Italy",        short_code: "ITA", flag: "it" },
  { name: "Croatia",      short_code: "CRO", flag: "hr" },
  { name: "Poland",       short_code: "POL", flag: "pl" },
  { name: "Austria",      short_code: "AUT", flag: "at" },
  { name: "Switzerland",  short_code: "SUI", flag: "ch" },
  { name: "Scotland",     short_code: "SCO", flag: "gb-sct" },
  { name: "Serbia",       short_code: "SRB", flag: "rs" },
  { name: "Denmark",      short_code: "DEN", flag: "dk" },
  { name: "Turkey",       short_code: "TUR", flag: "tr" },
  // CONMEBOL (6)
  { name: "Brazil",       short_code: "BRA", flag: "br" },
  { name: "Argentina",    short_code: "ARG", flag: "ar" },
  { name: "Colombia",     short_code: "COL", flag: "co" },
  { name: "Uruguay",      short_code: "URU", flag: "uy" },
  { name: "Ecuador",      short_code: "ECU", flag: "ec" },
  { name: "Paraguay",     short_code: "PAR", flag: "py" },
  // CONCACAF (6 — includes hosts USA, Mexico, Canada)
  { name: "USA",          short_code: "USA", flag: "us" },
  { name: "Mexico",       short_code: "MEX", flag: "mx" },
  { name: "Canada",       short_code: "CAN", flag: "ca" },
  { name: "Panama",       short_code: "PAN", flag: "pa" },
  { name: "Costa Rica",   short_code: "CRC", flag: "cr" },
  { name: "Honduras",     short_code: "HON", flag: "hn" },
  // CAF (9)
  { name: "Morocco",      short_code: "MAR", flag: "ma" },
  { name: "Egypt",        short_code: "EGY", flag: "eg" },
  { name: "Senegal",      short_code: "SEN", flag: "sn" },
  { name: "Nigeria",      short_code: "NGA", flag: "ng" },
  { name: "Cameroon",     short_code: "CMR", flag: "cm" },
  { name: "South Africa", short_code: "RSA", flag: "za" },
  { name: "Ghana",        short_code: "GHA", flag: "gh" },
  { name: "Tunisia",      short_code: "TUN", flag: "tn" },
  { name: "Algeria",      short_code: "ALG", flag: "dz" },
  // AFC (8)
  { name: "Japan",        short_code: "JPN", flag: "jp" },
  { name: "South Korea",  short_code: "KOR", flag: "kr" },
  { name: "Iran",         short_code: "IRN", flag: "ir" },
  { name: "Saudi Arabia", short_code: "KSA", flag: "sa" },
  { name: "Australia",    short_code: "AUS", flag: "au" },
  { name: "Qatar",        short_code: "QAT", flag: "qa" },
  { name: "Iraq",         short_code: "IRQ", flag: "iq" },
  { name: "Uzbekistan",   short_code: "UZB", flag: "uz" },
  // OFC + likely qualifiers (3)
  { name: "New Zealand",  short_code: "NZL", flag: "nz" },
  { name: "Venezuela",    short_code: "VEN", flag: "ve" },
  { name: "Slovenia",     short_code: "SVN", flag: "si" },
];

// ─────────────────────────────────────────────
// 12 groups × 4 teams = 48 teams
// ─────────────────────────────────────────────
const GROUPS: Record<string, string[]> = {
  A: ["Germany",     "Brazil",      "Morocco",      "Japan"],
  B: ["Spain",       "Argentina",   "Egypt",        "South Korea"],
  C: ["France",      "Colombia",    "Senegal",      "USA"],
  D: ["England",     "Uruguay",     "Algeria",      "Mexico"],
  E: ["Portugal",    "Ecuador",     "Tunisia",      "Canada"],
  F: ["Netherlands", "Paraguay",    "Ghana",        "Iran"],
  G: ["Belgium",     "Panama",      "Nigeria",      "Australia"],
  H: ["Italy",       "Costa Rica",  "Cameroon",     "Saudi Arabia"],
  I: ["Croatia",     "Honduras",    "South Africa", "Qatar"],
  J: ["Poland",      "Serbia",      "New Zealand",  "Iraq"],
  K: ["Austria",     "Switzerland", "Uzbekistan",   "Venezuela"],
  L: ["Denmark",     "Turkey",      "Scotland",     "Slovenia"],
};

// Round-robin pairings (index pairs within a 4-team group)
// MD1: [0v1, 2v3], MD2: [0v2, 1v3], MD3: [0v3, 1v2]
const ROUND_ROBIN: [number, number][][] = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function addDays(base: string, days: number): string {
  // base: 'YYYY-MM-DD', treated as UTC midnight for arithmetic only
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Generates 72 kickoff datetime strings in GMT+8.
 * Layout: 3 matchdays × 24 matches each
 *   MD1: June 11-16 (6 days × 4 matches)
 *   MD2: June 17-22
 *   MD3: June 23-28
 * Times per day: 14:00, 17:00, 20:00, 23:00
 */
function buildKickoffSlots(): string[] {
  const times = ["14:00", "17:00", "20:00", "23:00"];
  const slots: string[] = [];
  for (let day = 0; day < 18; day++) {
    const date = addDays("2026-06-11", day);
    for (const t of times) {
      slots.push(`${date}T${t}`);
    }
  }
  return slots; // 72 entries
}

// ─────────────────────────────────────────────
// Return type
// ─────────────────────────────────────────────
export type SeedResult =
  | { ok: true; inserted: number; skipped: number }
  | { error: string };

// ─────────────────────────────────────────────
// Action 1: Seed 48 WC teams
// ─────────────────────────────────────────────
export async function seedTeamsAction(): Promise<SeedResult> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  // Fetch existing names to skip duplicates
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
// Action 2: Generate 72 group-stage matches
// ─────────────────────────────────────────────
export async function seedMatchesAction(): Promise<SeedResult> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  // Idempotency guard: abort if scheduled matches already exist
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("status", "scheduled");

  if ((count ?? 0) >= 10) {
    return {
      error: `已有 ${count} 场 scheduled 赛程。请先点 "Clear Scheduled Matches" 再重新生成。`,
    };
  }

  // Load team IDs by name
  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, name");
  if (teamsErr || !teams) return { error: "无法获取队伍数据" };

  const nameToId = new Map(teams.map((t) => [t.name, t.id]));

  // Verify all required teams are present
  for (const [group, names] of Object.entries(GROUPS)) {
    for (const name of names) {
      if (!nameToId.has(name)) {
        return { error: `找不到队伍 "${name}"（组 ${group}），请先点 "Seed World Cup Teams"。` };
      }
    }
  }

  // Build ordered match pairs (72 total, grouped by matchday)
  const matchPairs: [string, string][] = [];
  for (const mdPairs of ROUND_ROBIN) {
    for (const [i, j] of mdPairs) {
      for (const teamNames of Object.values(GROUPS)) {
        matchPairs.push([teamNames[i], teamNames[j]]);
      }
    }
  }

  // Assign kickoff times
  const slots = buildKickoffSlots();

  const rows = matchPairs.map((pair, idx) => ({
    home_team_id: nameToId.get(pair[0])!,
    away_team_id: nameToId.get(pair[1])!,
    kickoff_at: malaysiaToUtc(slots[idx]).toISOString(),
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

  // Count first so we can report how many were deleted
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
