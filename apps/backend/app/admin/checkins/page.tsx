import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia, malaysiaDateString } from "@k8event/shared/time/malaysia";

export const metadata = { title: "签到记录 · 管理后台" };

export default async function CheckinsPage(props: {
  searchParams: Promise<{ date?: string; page?: string }>;
}) {
  await requireRole("admin");
  const sp = await props.searchParams;
  const date =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : malaysiaDateString();
  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const supabase = await createSupabaseServerClient();

  const { data: records, count } = await supabase
    .from("player_checkins")
    .select(
      "id, checkin_date, streak_day, tokens_awarded, created_at, player:profiles!player_checkins_player_id_fkey(username, display_name)",
      { count: "exact" },
    )
    .eq("checkin_date", date)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const totalPages = Math.ceil((count ?? 0) / pageSize);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">签到记录</h1>
        <span className="text-sm text-zinc-500">
          {date} · 共 {count ?? 0} 条
        </span>
      </div>

      {/* Date filter */}
      <form method="get" className="flex items-center gap-3">
        <label className="text-sm text-zinc-600">日期</label>
        <input
          type="date"
          name="date"
          defaultValue={date}
          className="h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
        />
        <button
          type="submit"
          className="h-9 px-4 rounded-md border border-zinc-300 text-sm hover:bg-zinc-50"
        >
          查询
        </button>
      </form>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">玩家</th>
              <th className="px-4 py-3 font-medium">签到日期</th>
              <th className="px-4 py-3 font-medium text-center">连续天数</th>
              <th className="px-4 py-3 font-medium text-right">获得 Token</th>
              <th className="px-4 py-3 font-medium">记录时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {!records?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-zinc-500">
                  该日期暂无签到记录。
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const player = Array.isArray(r.player) ? r.player[0] : r.player;
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      {player?.display_name ?? "—"}{" "}
                      <span className="text-zinc-500 font-mono text-xs">
                        ({player?.username})
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.checkin_date}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600">
                        🔥 第 {r.streak_day} 天
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-green-600">
                      +{r.tokens_awarded}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {formatMalaysia(r.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          {page > 1 && (
            <a
              href={`?date=${date}&page=${page - 1}`}
              className="h-8 px-3 rounded border border-zinc-300 flex items-center hover:bg-zinc-50"
            >
              上一页
            </a>
          )}
          <span className="text-zinc-500">
            第 {page} / {totalPages} 页
          </span>
          {page < totalPages && (
            <a
              href={`?date=${date}&page=${page + 1}`}
              className="h-8 px-3 rounded border border-zinc-300 flex items-center hover:bg-zinc-50"
            >
              下一页
            </a>
          )}
        </div>
      )}
    </div>
  );
}
