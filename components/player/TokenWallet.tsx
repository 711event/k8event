import Link from "next/link";
import { Coins, TrendingUp, Wallet } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { RechargeProgress } from "./RechargeProgress";

export function TokenWallet({
  balance,
  earned,
  todayRecharge,
  threshold = 500,
  guest = false,
}: {
  balance: number;
  earned: number;
  todayRecharge: number;
  threshold?: number;
  guest?: boolean;
}) {
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-5">
      {/* gold sheen */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl"
        style={{ background: "rgba(255,200,87,0.18)" }}
      />

      <div className="relative flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-[var(--gold-500)]/15 text-[var(--gold-500)] flex items-center justify-center">
            <Wallet size={16} />
          </span>
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-lo)]">我的 Token</div>
            <div className="text-[11px] text-[var(--text-mid)]">活动累计 · 可用兑换</div>
          </div>
        </div>
        {!guest && (
          <Link
            href="/tokens"
            className="text-xs text-[var(--gold-300)] hover:text-[var(--gold-500)] transition"
          >
            流水 →
          </Link>
        )}
      </div>

      {guest ? (
        <div className="relative">
          <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--text-lo)] tabular-nums">
            ——
          </div>
          <p className="mt-2 text-sm text-[var(--text-mid)]">
            登录后查看你的 Token 余额和今日资格。
          </p>
          <Link
            href="/login"
            className="mt-3 inline-flex h-9 px-4 items-center rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] text-sm font-semibold hover:brightness-110 transition"
          >
            登录领取
          </Link>
        </div>
      ) : (
        <>
          <div className="relative flex items-end gap-4">
            <div>
              <div className="font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--gold-300)] tabular-nums leading-none">
                <AnimatedNumber value={balance} />
              </div>
              <div className="text-[11px] text-[var(--text-lo)] mt-1.5">当前余额</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-[var(--pitch-400)] mb-1 ml-auto">
              <TrendingUp size={12} />
              累计 <AnimatedNumber value={earned} className="tabular-nums" />
              <Coins size={12} />
            </div>
          </div>

          <div className="relative mt-4">
            <RechargeProgress amount={todayRecharge} threshold={threshold} />
          </div>
        </>
      )}
    </section>
  );
}
