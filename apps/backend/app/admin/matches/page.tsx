import Link from "next/link";
import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { CreateMatchForm } from "./CreateMatchForm";
import { StatusBadge } from "./StatusBadge";
import { SeedMatchesButton } from "./SeedMatchesButton";

export const metadata = { title: "比赛 · 管理后台" };

export default async function MatchesPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();

  const [{ data: matches }, { data: teams }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, kickoff_at, token_reward, status, result, stage, home_team_id, away_team_id, home:teams!matches_home_team_id_fkey(name, short_code, logo_url), away:teams!matches_away_team_id_fkey(name, short_code, logo_url)",
      )
      .order("kickoff_at", { ascending: false })
      .limit(200),
    supabase.from("teams").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">比赛管理</h1>
        <span className="text-sm text-zinc-500">共 {matches?.length ?? 0} 场比赛</span>
      </div>

      <section className="rounded-lg border border-zinc-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-medium">生成赛程</h2>
          <SeedMatchesButton />
        </div>
        <div className="border-t border-zinc-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">创建比赛</h2>
          <a
            href="https://worldcupkickofftimes.com/schedule/sgt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline whitespace-nowrap"
          >
            🌐 世界杯完整赛程表 →
          </a>
        </div>
        {(!teams || teams.length < 2) ? (
          <p className="text-sm text-zinc-500">
            请先在{" "}
            <Link href="/admin/teams" className="underline">球队管理</Link> 页面添加至少 2 支队伍。
          </p>
        ) : (
          <CreateMatchForm teams={teams} />
        )}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">开赛时间 (GMT+8)</th>
              <th className="px-4 py-3 font-medium">赛阶</th>
              <th className="px-4 py-3 font-medium">比赛</th>
              <th className="px-4 py-3 font-medium">奖励</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {!matches?.length ? (
              <tr><td colSpan={6} className="px-4 py-6 text-zinc-500">暂无比赛记录</td></tr>
            ) : (
              matches.map((m) => {
                const home = Array.isArray(m.home) ? m.home[0] : m.home;
                const away = Array.isArray(m.away) ? m.away[0] : m.away;
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {formatMalaysia(m.kickoff_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                      {m.stage ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        {home?.logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={home.logo_url} alt="" className="h-4 w-4 rounded-sm object-contain flex-shrink-0" />
                        )}
                        <span className="font-medium">{home?.name ?? "?"}</span>
                      </span>
                      <span className="text-zinc-500 mx-2">vs</span>
                      <span className="inline-flex items-center gap-1.5">
                        {away?.logo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={away.logo_url} alt="" className="h-4 w-4 rounded-sm object-contain flex-shrink-0" />
                        )}
                        <span className="font-medium">{away?.name ?? "?"}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{m.token_reward}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} result={m.result} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/matches/${m.id}`} className="text-sm underline">
                        查看
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
