import Link from "next/link";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { getGroupId } from "@/lib/get-group";

export const metadata = { title: "Prediction Records · Admin Panel" };

export default async function PredictionsPage(props: {
  searchParams: Promise<{ date?: string; q?: string }>;
}) {
  await requireRole("admin");
  const sp = await props.searchParams;

  // Default to yesterday GMT+8
  const yesterday = new Date(Date.now() + 8 * 3_600_000 - 86_400_000)
    .toISOString()
    .slice(0, 10);
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : yesterday;
  const q = (sp.q ?? "").trim().toLowerCase();

  const supabase = await createSupabaseServerClient();
  const groupId = getGroupId();

  // ── Activity settings ───────────────────────────────────────────────────
  const { data: activity } = await supabase
    .from("activities")
    .select("settings")
    .eq("type", "worldcup_prediction")
    .eq("group_id", groupId)
    .maybeSingle();

  const settings = (activity?.settings ?? {}) as Record<string, unknown>;
  const minRecharge = Number(settings.min_recharge_amount ?? 500);
  const chancesPerDay = Number(settings.chances_per_recharge ?? 1);
  const maxChances = Number(settings.max_chances ?? 0);

  // ── Chance balances: qualifying recharge days & total predictions per player ──
  const { data: rechargeRows } = await supabase
    .from("daily_recharge")
    .select("player_id, amount")
    .gte("amount", minRecharge)
    .in(
      "player_id",
      // sub-select: all player IDs in this group
      (
        await supabase
          .from("profiles")
          .select("user_id")
          .eq("group_id", groupId)
          .eq("role", "player")
      ).data?.map((r) => r.user_id) ?? [],
    );

  const { data: predCountRows } = await supabase
    .from("predictions")
    .select("player_id")
    .in(
      "player_id",
      (
        await supabase
          .from("profiles")
          .select("user_id")
          .eq("group_id", groupId)
          .eq("role", "player")
      ).data?.map((r) => r.user_id) ?? [],
    );

  // ── Players with at least one relevant record ───────────────────────────
  const { data: players } = await supabase
    .from("profiles")
    .select("user_id, username, display_name")
    .eq("group_id", groupId)
    .eq("role", "player")
    .order("username");

  // Build maps
  const earnedMap = new Map<string, number>();
  for (const r of rechargeRows ?? []) {
    earnedMap.set(r.player_id, (earnedMap.get(r.player_id) ?? 0) + chancesPerDay);
  }
  const usedMap = new Map<string, number>();
  for (const r of predCountRows ?? []) {
    usedMap.set(r.player_id, (usedMap.get(r.player_id) ?? 0) + 1);
  }

  const balances = (players ?? [])
    .map((p) => {
      const earned = earnedMap.get(p.user_id) ?? 0;
      const used = usedMap.get(p.user_id) ?? 0;
      let remaining = Math.max(0, earned - used);
      if (maxChances > 0) remaining = Math.min(remaining, maxChances);
      return { ...p, earned, used, remaining };
    })
    .filter((b) => b.earned > 0 || b.used > 0)
    .filter((b) => {
      if (!q) return true;
      return (
        (b.username ?? "").toLowerCase().includes(q) ||
        (b.display_name ?? "").toLowerCase().includes(q)
      );
    });

  // ── Predictions on selected date ────────────────────────────────────────
  const dateStart = `${date}T00:00:00+08:00`;
  const dateEnd = `${date}T23:59:59+08:00`;

  const { data: rawPredictions } = await supabase
    .from("predictions")
    .select(
      `match_id, player_id, pick, is_correct, awarded, submitted_at,
       player:profiles!predictions_player_id_fkey(user_id, username, display_name, group_id),
       match:matches!predictions_match_id_fkey(
         kickoff_at,
         home:teams!matches_home_team_id_fkey(name),
         away:teams!matches_away_team_id_fkey(name)
       )`,
    )
    .gte("submitted_at", dateStart)
    .lte("submitted_at", dateEnd)
    .order("submitted_at", { ascending: false });

  const predictions = (rawPredictions ?? []).filter((pred) => {
    const player = Array.isArray(pred.player) ? pred.player[0] : pred.player;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (player as any)?.group_id === groupId;
  });

  const pickLabel = (pick: string) => {
    if (pick === "home") return "主队胜";
    if (pick === "away") return "客队胜";
    return "平局";
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <h1 className="text-2xl font-semibold">竞猜记录</h1>

      {/* ── Section 1: Chance Balances ─────────────────────────────────── */}
      <section className="rounded-lg border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-zinc-50">
          <div>
            <h2 className="text-base font-medium">竞猜机会余额</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              最低充值 RM{minRecharge} · 每次获得 {chancesPerDay} 次 ·{" "}
              {maxChances > 0 ? `上限 ${maxChances} 次` : "不限上限"}
            </p>
          </div>
          {/* Search */}
          <form method="GET" className="flex gap-2">
            {sp.date && <input type="hidden" name="date" value={date} />}
            <input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="搜索玩家…"
              className="h-8 px-3 text-sm rounded border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-400 w-40"
            />
            <button
              type="submit"
              className="h-8 px-3 text-sm rounded bg-zinc-900 text-white hover:bg-zinc-700"
            >
              搜索
            </button>
          </form>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left border-b border-zinc-200">
            <tr>
              <th className="px-4 py-2.5 font-medium text-zinc-600">玩家</th>
              <th className="px-4 py-2.5 font-medium text-zinc-600 text-right">累计获得</th>
              <th className="px-4 py-2.5 font-medium text-zinc-600 text-right">已使用</th>
              <th className="px-4 py-2.5 font-medium text-zinc-600 text-right">剩余</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {balances.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-zinc-400 text-center">
                  暂无记录
                </td>
              </tr>
            ) : (
              balances.map((b) => (
                <tr key={b.user_id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{b.display_name || b.username}</span>
                    {b.display_name && (
                      <span className="ml-1.5 text-xs text-zinc-400 font-mono">({b.username})</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{b.earned}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">{b.used}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={
                        "inline-block tabular-nums font-semibold " +
                        (b.remaining > 0 ? "text-green-600" : "text-zinc-400")
                      }
                    >
                      {b.remaining}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* ── Section 2: Daily prediction records ────────────────────────── */}
      <section className="rounded-lg border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-zinc-50">
          <h2 className="text-base font-medium">
            {date} 竞猜记录
            <span className="ml-2 text-sm text-zinc-400 font-normal">共 {predictions.length} 条</span>
          </h2>
          {/* Date picker */}
          <form method="GET" className="flex gap-2 items-center">
            {q && <input type="hidden" name="q" value={q} />}
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="h-8 px-2 text-sm rounded border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
            <button
              type="submit"
              className="h-8 px-3 text-sm rounded bg-zinc-900 text-white hover:bg-zinc-700"
            >
              查看
            </button>
          </form>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left border-b border-zinc-200">
            <tr>
              <th className="px-4 py-2.5 font-medium text-zinc-600">玩家</th>
              <th className="px-4 py-2.5 font-medium text-zinc-600">比赛</th>
              <th className="px-4 py-2.5 font-medium text-zinc-600">竞猜</th>
              <th className="px-4 py-2.5 font-medium text-zinc-600">结果</th>
              <th className="px-4 py-2.5 font-medium text-zinc-600 text-right">Token</th>
              <th className="px-4 py-2.5 font-medium text-zinc-600">时间 (GMT+8)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {predictions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-zinc-400 text-center">
                  该日期暂无竞猜记录
                </td>
              </tr>
            ) : (
              predictions.map((pred) => {
                const player = Array.isArray(pred.player) ? pred.player[0] : pred.player;
                const match = Array.isArray(pred.match) ? pred.match[0] : pred.match;
                const home = Array.isArray(match?.home) ? match.home[0] : match?.home;
                const away = Array.isArray(match?.away) ? match.away[0] : match?.away;
                return (
                  <tr key={`${pred.match_id}_${pred.player_id}`} className="hover:bg-zinc-50">
                    <td className="px-4 py-2.5">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <span className="font-medium">{(player as any)?.display_name || (player as any)?.username}</span>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(player as any)?.display_name && (
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        <span className="ml-1 text-xs text-zinc-400 font-mono">({(player as any)?.username})</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600">
                      {home?.name ?? "?"} <span className="text-zinc-400">vs</span> {away?.name ?? "?"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700">
                        {pickLabel(pred.pick)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {pred.is_correct === null ? (
                        <span className="text-xs text-zinc-400">待结算</span>
                      ) : pred.is_correct ? (
                        <span className="text-xs font-medium text-green-600">✓ 正确</span>
                      ) : (
                        <span className="text-xs text-zinc-400">✗ 错误</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {pred.awarded ? (
                        <span className="text-amber-600 font-medium">+{pred.awarded}</span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500 font-mono">
                      {formatMalaysia(pred.submitted_at, "MM-dd HH:mm")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-zinc-400">
        竞猜机会余额实时计算（累计合格充值天数 × {chancesPerDay} − 已用次数）。如数据异常请检查充值导入记录。
        <Link href="/admin/recharge" className="underline ml-1">前往充值导入</Link>
      </p>
    </div>
  );
}
