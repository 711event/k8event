import Link from "next/link";
import { CheckCircle2, Clock, Truck, XCircle, Gift } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMalaysia } from "@/lib/time/malaysia";
import { SectionHeader } from "@/components/player/SectionHeader";
import { EmptyState } from "@/components/player/EmptyState";
import { Chip } from "@/components/player/Chip";
import type { RedemptionStatus } from "@/lib/supabase/types";

export const metadata = { title: "兑换记录 · k8event" };
export const dynamic = "force-dynamic";

export default async function MyRedemptionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="space-y-5">
        <SectionHeader title="兑换记录" />
        <EmptyState
          icon={<Gift size={28} />}
          title="登录后查看兑换记录"
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

  const { data: rows } = await supabase
    .from("redemption_requests")
    .select(
      "id, status, cost_at_request, note, created_at, decided_at, item:reward_items!redemption_requests_item_id_fkey(name, image_url)",
    )
    .eq("player_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <SectionHeader title="兑换记录" hint="奖励由客服线下发放" />

      {!rows?.length ? (
        <EmptyState
          icon={<Gift size={28} />}
          title="还没有兑换记录"
          body="去奖励中心看看心仪的奖品吧。"
          action={
            <Link
              href="/reward"
              className="h-9 px-5 inline-flex items-center rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] text-sm font-semibold hover:brightness-110 transition"
            >
              去兑换
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => {
            const item = Array.isArray(r.item) ? r.item[0] : r.item;
            return (
              <li
                key={r.id}
                className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 rounded-[var(--radius-sm)] bg-[var(--bg-raised)] overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Gift size={22} className="text-[var(--text-lo)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm text-[var(--text-hi)] truncate">
                        {item?.name ?? "—"}
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-[11px] text-[var(--text-lo)] mt-0.5">
                      {formatMalaysia(r.created_at, "yyyy-MM-dd HH:mm")} · 花费{" "}
                      <span className="text-[var(--gold-300)] tabular-nums">
                        {r.cost_at_request.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <StatusTimeline status={r.status} />
                {r.status === "rejected" && r.note && (
                  <div className="mt-2 text-xs text-[var(--text-mid)] bg-[var(--bg-raised)] rounded px-3 py-2">
                    备注:{r.note}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: RedemptionStatus }) {
  if (status === "rejected") {
    return (
      <Chip variant="crimson" className="inline-flex items-center gap-1 flex-shrink-0">
        <XCircle size={11} />
        已拒绝
      </Chip>
    );
  }
  if (status === "fulfilled") {
    return (
      <Chip variant="pitch" className="inline-flex items-center gap-1 flex-shrink-0">
        <CheckCircle2 size={11} />
        已发放
      </Chip>
    );
  }
  if (status === "approved") {
    return (
      <Chip variant="azure" className="inline-flex items-center gap-1 flex-shrink-0">
        <Truck size={11} />
        已批准
      </Chip>
    );
  }
  return (
    <Chip variant="gold" className="inline-flex items-center gap-1 flex-shrink-0">
      <Clock size={11} />
      待审核
    </Chip>
  );
}

function StatusTimeline({ status }: { status: RedemptionStatus }) {
  if (status === "rejected") {
    return (
      <div className="mt-3 text-[11px] text-[var(--crimson-500)]">
        Token 已自动退回到你的余额。
      </div>
    );
  }
  const steps: { key: RedemptionStatus; label: string }[] = [
    { key: "pending", label: "待审核" },
    { key: "approved", label: "已批准" },
    { key: "fulfilled", label: "已发放" },
  ];
  const reachedIdx = steps.findIndex((s) => s.key === status);

  return (
    <div className="mt-3 flex items-center gap-2">
      {steps.map((s, i) => {
        const done = i <= reachedIdx;
        const isCurrent = i === reachedIdx;
        return (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className="flex flex-col items-center gap-1 flex-1">
              <span
                className={
                  "h-2 w-2 rounded-full " +
                  (done
                    ? isCurrent
                      ? "bg-[var(--gold-300)] shadow-[0_0_8px_var(--gold-500)]"
                      : "bg-[var(--pitch-500)]"
                    : "bg-[var(--border-strong)]")
                }
              />
              <span
                className={
                  "text-[10px] " +
                  (done ? "text-[var(--text-mid)] font-medium" : "text-[var(--text-lo)]")
                }
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={
                  "h-px flex-1 -mt-3 " +
                  (i < reachedIdx ? "bg-[var(--pitch-500)]/40" : "bg-[var(--border-strong)]")
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
