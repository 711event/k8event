import Link from "next/link";
import { Coins, Gift, Lock } from "lucide-react";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { SectionHeader } from "@/components/player/SectionHeader";
import { EmptyState } from "@/components/player/EmptyState";
import { Chip } from "@/components/player/Chip";
import { getFeLocale } from "@/lib/get-locale";
import { tFe } from "@/lib/i18n";

export const metadata = { title: "奖励中心 · 711event" };
export const dynamic = "force-dynamic";

export default async function RewardPage() {
  const user = await getCurrentUser();
  const locale = await getFeLocale();
  const t = (k: Parameters<typeof tFe>[1], v?: Parameters<typeof tFe>[2]) => tFe(locale, k, v);
  const supabase = await createSupabaseServerClient();

  const [{ data: items }, balanceRes] = await Promise.all([
    supabase
      .from("reward_items")
      .select("id, name, description, image_url, cost, stock, is_active")
      .eq("is_active", true)
      .order("cost"),
    user
      ? supabase.from("token_balances").select("balance").eq("player_id", user.id).maybeSingle()
      : Promise.resolve({ data: null } as const),
  ]);

  const myBalance = user ? balanceRes?.data?.balance ?? 0 : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader title={t("reward_title")} hint={t("reward_subtitle")} />
        {user ? (
          <Link
            href="/redemptions"
            className="inline-flex items-center gap-1 text-xs text-[var(--text-mid)] hover:text-[var(--gold-300)] transition whitespace-nowrap"
          >
            {t("reward_history")}
          </Link>
        ) : null}
      </div>

      {user ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--gold-500)]/30 bg-gradient-to-br from-[var(--bg-elevated)] to-[#1A1410] p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-lo)]">{t("reward_my_tokens")}</div>
            <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--gold-300)] tabular-nums mt-0.5">
              {myBalance.toLocaleString()}
            </div>
          </div>
          <Coins className="text-[var(--gold-500)]/40" size={36} />
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)]/40 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-[var(--bg-raised)] flex items-center justify-center text-[var(--text-mid)] flex-shrink-0">
              <Lock size={16} />
            </div>
            <p className="text-xs text-[var(--text-mid)] truncate">{t("reward_login_prompt")}</p>
          </div>
          <Link
            href="/login"
            className="h-8 px-3 inline-flex items-center rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] text-xs font-semibold hover:brightness-110 transition flex-shrink-0"
          >
            {t("reward_login_btn")}
          </Link>
        </div>
      )}

      {!items?.length ? (
        <EmptyState
          icon={<Gift size={28} />}
          title={t("reward_empty_title")}
          body={t("reward_empty_body")}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((it) => {
            const outOfStock = it.stock === 0;
            const affordable = !user || myBalance >= it.cost;
            return (
              <Link
                key={it.id}
                href={`/reward/${it.id}`}
                className="group block rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] overflow-hidden hover:border-[var(--gold-500)]/50 hover:shadow-[var(--shadow-card)] transition"
              >
                <div className="aspect-square bg-[var(--bg-raised)] overflow-hidden relative">
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.image_url}
                      alt=""
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[var(--text-lo)]">
                      <Gift size={32} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                  {outOfStock && (
                    <div className="absolute top-2 right-2">
                      <Chip variant="neutral">{t("reward_sold_out")}</Chip>
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="font-semibold text-sm text-[var(--text-hi)] truncate">{it.name}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[var(--gold-300)] font-semibold text-sm">
                      <Coins size={12} />
                      <span className="tabular-nums">{it.cost.toLocaleString()}</span>
                    </div>
                    {!user ? null : outOfStock ? null : !affordable ? (
                      <Chip variant="crimson">{t("reward_insufficient")}</Chip>
                    ) : (
                      <Chip variant="pitch">{t("reward_redeemable")}</Chip>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
