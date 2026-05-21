import Link from "next/link";
import { CheckCircle2, XCircle, Clock, Trophy } from "lucide-react";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { formatMalaysia } from "@k8event/shared/time/malaysia";
import { SectionHeader } from "@/components/player/SectionHeader";
import { EmptyState } from "@/components/player/EmptyState";
import { Chip } from "@/components/player/Chip";
import { getFeLocale } from "@/lib/get-locale";
import { tFe } from "@/lib/i18n";

export const metadata = { title: "我的预测 · 711event" };
export const dynamic = "force-dynamic";

type Filter = "all" | "won" | "lost" | "pending";

export default async function HistoryPage(props: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await props.searchParams;
  const active: Filter =
    sp.filter === "won" || sp.filter === "lost" || sp.filter === "pending" ? sp.filter : "all";

  const locale = await getFeLocale();
  const t = (k: Parameters<typeof tFe>[1], v?: Parameters<typeof tFe>[2]) => tFe(locale, k, v);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t("history_filter_all") },
    { key: "won", label: t("history_filter_won") },
    { key: "lost", label: t("history_filter_lost") },
    { key: "pending", label: t("history_filter_pending") },
  ];

  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="space-y-5">
        <SectionHeader title={t("history_title")} />
        <EmptyState
          icon={<Trophy size={28} />}
          title={t("history_login_prompt")}
          body={t("history_login_body")}
          action={
            <Link
              href="/login"
              className="h-9 px-5 inline-flex items-center rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] text-sm font-semibold hover:brightness-110 transition"
            >
              {t("checkin_login_btn")}
            </Link>
          }
        />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();

  const { data: predictions } = await supabase
    .from("predictions")
    .select(
      "pick, is_correct, awarded, submitted_at, match:matches!predictions_match_id_fkey(id, kickoff_at, status, result, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name))",
    )
    .eq("player_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(200);

  const items = (predictions ?? []).filter((p) => {
    if (active === "won") return p.is_correct === true;
    if (active === "lost") return p.is_correct === false;
    if (active === "pending") return p.is_correct === null;
    return true;
  });

  return (
    <div className="space-y-5">
      <SectionHeader title={t("history_title")} hint={t("history_hint")} />

      <div className="inline-flex rounded-full bg-[var(--bg-raised)] p-1 border border-[var(--border-strong)] overflow-x-auto">
        {filters.map((f) => {
          const isActive = active === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === "all" ? "/history" : `/history?filter=${f.key}`}
              className={
                "px-4 py-1.5 text-xs font-semibold rounded-full transition whitespace-nowrap " +
                (isActive
                  ? "bg-[var(--bg-elevated)] text-[var(--gold-300)]"
                  : "text-[var(--text-lo)] hover:text-[var(--text-mid)]")
              }
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Trophy size={28} />}
          title={t("history_empty_title")}
          body={active === "all" ? t("history_empty_all") : t("history_empty_filter")}
          action={
            active === "all" ? (
              <Link
                href="/matches"
                className="h-9 px-5 inline-flex items-center rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] text-sm font-semibold hover:brightness-110 transition"
              >
                {t("history_go_predict")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-3">
          {items.map((p, i) => {
            const m = Array.isArray(p.match) ? p.match[0] : p.match;
            if (!m) return null;
            const home = Array.isArray(m.home) ? m.home[0] : m.home;
            const away = Array.isArray(m.away) ? m.away[0] : m.away;
            const pickedName =
              p.pick === "home"
                ? home?.name ?? t("history_home_fallback")
                : away?.name ?? t("history_away_fallback");
            return (
              <li key={i}>
                <Link
                  href={`/matches/${m.id}`}
                  className="block rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4 hover:border-[var(--gold-500)]/40 hover:shadow-[var(--shadow-card)] transition"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--text-hi)] truncate">
                        {home?.name ?? "?"} <span className="text-[var(--gold-300)] mx-1">VS</span> {away?.name ?? "?"}
                      </div>
                      <div className="text-xs text-[var(--text-mid)] mt-1">
                        {t("history_my_pick")}<span className="text-[var(--gold-300)] font-semibold">{pickedName}</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-lo)] mt-1">
                        {formatMalaysia(m.kickoff_at, "MM-dd HH:mm")} (GMT+8)
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {p.is_correct === null ? (
                        <Chip variant="azure" className="inline-flex items-center gap-1">
                          <Clock size={11} />
                          {t("history_pending")}
                        </Chip>
                      ) : p.is_correct ? (
                        <div className="flex flex-col items-end gap-1">
                          <Chip variant="pitch" className="inline-flex items-center gap-1">
                            <CheckCircle2 size={11} />
                            {t("history_won")}
                          </Chip>
                          <span className="text-xs font-semibold text-[var(--gold-300)] tabular-nums">
                            +{p.awarded ?? 0}
                          </span>
                        </div>
                      ) : (
                        <Chip variant="crimson" className="inline-flex items-center gap-1">
                          <XCircle size={11} />
                          {t("history_lost")}
                        </Chip>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
