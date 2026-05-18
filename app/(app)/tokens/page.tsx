import Link from "next/link";
import { Coins, TrendingUp, ArrowDownRight, ArrowUpRight, Trophy, Gift } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMalaysia, malaysiaDateString } from "@/lib/time/malaysia";
import { SectionHeader } from "@/components/player/SectionHeader";
import { EmptyState } from "@/components/player/EmptyState";
import { AnimatedNumber } from "@/components/player/AnimatedNumber";
import type { TokenReason } from "@/lib/supabase/types";

export const metadata = { title: "Token 流水 · k8event" };
export const dynamic = "force-dynamic";

export default async function TokensPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="space-y-5">
        <SectionHeader title="Token 流水" />
        <EmptyState
          icon={<Coins size={28} />}
          title="登录后查看 Token 余额和流水"
          action={
            <Link
              href="/login"
              className="h-9 px-5 inline-flex items-center rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] text-sm font-semibold hover:brightness-110 transition"
            >
              去登录
            </Link>
          }
        />
      </div>
    );
  }
  const supabase = await createSupabaseServerClient();

  const [{ data: balanceRow }, { data: earnedRow }, { data: tx }] = await Promise.all([
    supabase.from("token_balances").select("balance").eq("player_id", user.id).maybeSingle(),
    supabase.from("token_earned").select("earned").eq("player_id", user.id).maybeSingle(),
    supabase
      .from("token_transactions")
      .select("id, delta, reason, note, created_at")
      .eq("player_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const balance = balanceRow?.balance ?? 0;
  const earned = earnedRow?.earned ?? 0;

  // Build 14-day earnings series in GMT+8
  const days: { date: string; earned: number }[] = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ date: malaysiaDateString(d), earned: 0 });
  }
  for (const t of tx ?? []) {
    if (t.delta <= 0) continue;
    const day = malaysiaDateString(t.created_at);
    const slot = days.find((d) => d.date === day);
    if (slot) slot.earned += t.delta;
  }
  const maxEarn = Math.max(1, ...days.map((d) => d.earned));

  return (
    <div className="space-y-5">
      <SectionHeader title="Token 流水" hint="马来西亚时间 (GMT+8)" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--gold-500)]/30 bg-gradient-to-br from-[var(--bg-elevated)] to-[#1A1410] p-4">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-lo)] mb-2">
            <Coins size={12} className="text-[var(--gold-300)]" />
            当前余额
          </div>
          <div className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-[var(--gold-300)] tabular-nums">
            <AnimatedNumber value={balance} />
          </div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--azure-500)]/30 bg-gradient-to-br from-[var(--bg-elevated)] to-[#0F1626] p-4">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-lo)] mb-2">
            <TrendingUp size={12} className="text-[var(--azure-500)]" />
            累计获得
          </div>
          <div className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-[var(--text-hi)] tabular-nums">
            <AnimatedNumber value={earned} />
          </div>
        </div>
      </div>

      {/* 14-day chart */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-wider text-[var(--text-lo)]">近 14 天收入</div>
          <div className="text-xs text-[var(--text-mid)] tabular-nums">
            合计 +{days.reduce((s, d) => s + d.earned, 0).toLocaleString()}
          </div>
        </div>
        <svg viewBox="0 0 280 80" className="w-full h-20 overflow-visible">
          {days.map((d, i) => {
            const h = d.earned === 0 ? 2 : Math.max(2, (d.earned / maxEarn) * 64);
            const x = i * 20 + 2;
            const y = 72 - h;
            return (
              <g key={d.date}>
                <rect
                  x={x}
                  y={y}
                  width={14}
                  height={h}
                  rx={2}
                  fill={d.earned === 0 ? "var(--border-strong)" : "url(#bar-gradient)"}
                />
              </g>
            );
          })}
          <defs>
            <linearGradient id="bar-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--gold-300)" />
              <stop offset="100%" stopColor="var(--gold-500)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="flex justify-between text-[9px] text-[var(--text-lo)] mt-1 tabular-nums">
          <span>{days[0]?.date.slice(5)}</span>
          <span>{days[6]?.date.slice(5)}</span>
          <span>{days[13]?.date.slice(5)}</span>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] text-xs uppercase tracking-wider text-[var(--text-lo)]">
          全部流水
        </div>
        {!tx?.length ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--text-lo)]">暂无流水</div>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {tx.map((t) => (
              <li key={t.id} className="px-4 py-3 flex items-center gap-3">
                <ReasonIcon reason={t.reason} delta={t.delta} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-hi)] font-medium">
                    {reasonLabel(t.reason)}
                  </div>
                  <div className="text-[11px] text-[var(--text-lo)] mt-0.5 truncate">
                    {formatMalaysia(t.created_at)}
                    {t.note ? <> · {t.note}</> : null}
                  </div>
                </div>
                <div
                  className={
                    "font-[family-name:var(--font-display)] text-sm font-bold tabular-nums whitespace-nowrap " +
                    (t.delta >= 0 ? "text-[var(--gold-300)]" : "text-[var(--crimson-500)]")
                  }
                >
                  {t.delta > 0 ? `+${t.delta}` : t.delta}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReasonIcon({ reason, delta }: { reason: TokenReason; delta: number }) {
  const cls =
    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 " +
    (delta >= 0
      ? "bg-[var(--gold-500)]/15 text-[var(--gold-300)]"
      : "bg-[var(--crimson-500)]/15 text-[var(--crimson-500)]");
  return (
    <div className={cls}>
      {reason === "match_win" ? (
        <Trophy size={14} />
      ) : reason === "redeem" ? (
        <Gift size={14} />
      ) : delta >= 0 ? (
        <ArrowUpRight size={14} />
      ) : (
        <ArrowDownRight size={14} />
      )}
    </div>
  );
}

function reasonLabel(reason: TokenReason): string {
  switch (reason) {
    case "match_win":
      return "比赛猜中奖励";
    case "redeem":
      return "兑换扣减";
    case "admin_adjust":
      return "管理员调整";
    default:
      return reason;
  }
}
