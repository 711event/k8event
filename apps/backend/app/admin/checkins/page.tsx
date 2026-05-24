import { requireRole } from "@k8event/shared/auth/require-role";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia, malaysiaDateString } from "@k8event/shared/time/malaysia";

export const metadata = { title: "签到记录 · 管理后台" };

type Mode = "today" | "this_month" | "last_month" | "range";

function getMalaysiaMonthRange(offset: 0 | -1): { from: string; to: string } {
  const now = new Date();
  const maNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = maNow.getUTCFullYear();
  const month = maNow.getUTCMonth(); // 0-indexed
  const first = new Date(Date.UTC(year, month + offset, 1));
  const last = new Date(Date.UTC(year, month + offset + 1, 0));
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
}

export default async function CheckinsPage(props: {
  searchParams: Promise<{
    mode?: string;
    date?: string;
    from?: string;
    to?: string;
    q?: string;
    page?: string;
  }>;
}) {
  await requireRole("admin");
  const sp = await props.searchParams;

  const mode: Mode =
    sp.mode === "this_month" || sp.mode === "last_month" || sp.mode === "range"
      ? sp.mode
      : "today";

  const today = malaysiaDateString();
  const singleDate =
    sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;

  const thisMonth = getMalaysiaMonthRange(0);
  const lastMonth = getMalaysiaMonthRange(-1);

  let dateFrom: string;
  let dateTo: string;
  let rangeFrom = sp.from ?? thisMonth.from;
  let rangeTo = sp.to ?? today;

  if (mode === "today") {
    dateFrom = singleDate;
    dateTo = singleDate;
  } else if (mode === "this_month") {
    dateFrom = thisMonth.from;
    dateTo = thisMonth.to;
  } else if (mode === "last_month") {
    dateFrom = lastMonth.from;
    dateTo = lastMonth.to;
  } else {
    dateFrom = rangeFrom;
    dateTo = rangeTo;
  }

  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const supabase = await createSupabaseServerClient();

  // If searching by member, resolve player_ids first
  let playerIdFilter: string[] | null = null;
  if (q) {
    const { data: matched } = await supabase
      .from("profiles")
      .select("user_id")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
    playerIdFilter = matched?.map((p) => p.user_id) ?? [];
  }

  let query = supabase
    .from("player_checkins")
    .select(
      "id, checkin_date, streak_day, tokens_awarded, created_at, player:profiles!player_checkins_player_id_fkey(username, display_name)",
      { count: "exact" },
    )
    .gte("checkin_date", dateFrom)
    .lte("checkin_date", dateTo)
    .order("checkin_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (playerIdFilter !== null) {
    if (playerIdFilter.length === 0) {
      // No players matched — force empty result
      query = query.eq("player_id", "00000000-0000-0000-0000-000000000000");
    } else {
      query = query.in("player_id", playerIdFilter);
    }
  }

  const { data: records, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  // Label for header
  const rangeLabel =
    mode === "today"
      ? singleDate
      : mode === "this_month"
      ? `${thisMonth.from} ~ ${thisMonth.to}`
      : mode === "last_month"
      ? `${lastMonth.from} ~ ${lastMonth.to}`
      : `${dateFrom} ~ ${dateTo}`;

  const tabBase =
    "h-9 px-4 rounded-md border text-sm font-medium transition whitespace-nowrap";
  const tabActive = "bg-zinc-900 text-white border-zinc-900";
  const tabIdle = "border-zinc-300 text-zinc-700 hover:bg-zinc-50";

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">签到记录</h1>
        <span className="text-sm text-zinc-500">
          {rangeLabel} · 共 {count ?? 0} 条
        </span>
      </div>

      {/* Filter bar */}
      <form method="get" className="space-y-3">
        {/* Quick mode tabs */}
        <div className="flex flex-wrap gap-2">
          <a
            href="?mode=today"
            className={`${tabBase} ${mode === "today" ? tabActive : tabIdle} inline-flex items-center`}
          >
            今天
          </a>
          <a
            href="?mode=this_month"
            className={`${tabBase} ${mode === "this_month" ? tabActive : tabIdle} inline-flex items-center`}
          >
            本月
          </a>
          <a
            href="?mode=last_month"
            className={`${tabBase} ${mode === "last_month" ? tabActive : tabIdle} inline-flex items-center`}
          >
            上个月
          </a>
          <a
            href="?mode=range"
            className={`${tabBase} ${mode === "range" ? tabActive : tabIdle} inline-flex items-center`}
          >
            自定义日期
          </a>
        </div>

        {/* Date inputs — changes based on mode */}
        <div className="flex flex-wrap items-center gap-3">
          {mode === "today" && (
            <>
              <input type="hidden" name="mode" value="today" />
              <label className="text-sm text-zinc-600">日期</label>
              <input
                type="date"
                name="date"
                defaultValue={singleDate}
                className="h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
              />
            </>
          )}

          {mode === "range" && (
            <>
              <input type="hidden" name="mode" value="range" />
              <label className="text-sm text-zinc-600">从</label>
              <input
                type="date"
                name="from"
                defaultValue={rangeFrom}
                className="h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
              />
              <label className="text-sm text-zinc-600">到</label>
              <input
                type="date"
                name="to"
                defaultValue={rangeTo}
                className="h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm"
              />
            </>
          )}

          {/* Member search — always visible */}
          <label className="text-sm text-zinc-600">搜索会员</label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="用户名 / 昵称"
            className="h-9 px-3 rounded-md border border-zinc-300 bg-white text-sm w-44"
          />

          <button
            type="submit"
            className="h-9 px-5 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition"
          >
            查询
          </button>

          {(q || mode !== "today" || singleDate !== today) && (
            <a
              href="/admin/checkins"
              className="h-9 px-4 rounded-md border border-zinc-300 text-sm text-zinc-600 hover:bg-zinc-50 inline-flex items-center"
            >
              重置
            </a>
          )}
        </div>
      </form>

      {/* Table */}
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
                <td colSpan={5} className="px-4 py-8 text-zinc-400 text-center">
                  {q ? `未找到匹配「${q}」的签到记录。` : "该时段暂无签到记录。"}
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const player = Array.isArray(r.player) ? r.player[0] : r.player;
                return (
                  <tr key={r.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <span className="font-medium">{player?.display_name ?? "—"}</span>{" "}
                      <span className="text-zinc-400 font-mono text-xs">
                        @{player?.username}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">
                      {r.checkin_date}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600">
                        🔥 第 {r.streak_day} 天
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-green-600">
                      +{r.tokens_awarded}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
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
              href={`?mode=${mode}&date=${singleDate}&from=${rangeFrom}&to=${rangeTo}&q=${q}&page=${page - 1}`}
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
              href={`?mode=${mode}&date=${singleDate}&from=${rangeFrom}&to=${rangeTo}&q=${q}&page=${page + 1}`}
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
