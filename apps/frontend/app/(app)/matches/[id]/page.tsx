import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Lock, Clock } from "lucide-react";
import { getCurrentUser } from "@k8event/shared/auth/get-user";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "@/lib/get-group";
import { StadiumHero } from "@/components/player/StadiumHero";
import { Chip } from "@/components/player/Chip";
import { getFeLocale } from "@/lib/get-locale";
import { tFe } from "@/lib/i18n";
import { PredictionForm } from "./PredictionForm";

export const metadata = { title: "比赛详情 · 711event" };
export const dynamic = "force-dynamic";

function oneOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default async function MatchDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const locale = await getFeLocale();
  const t = (k: Parameters<typeof tFe>[1], v?: Parameters<typeof tFe>[2]) => tFe(locale, k, v);
  const supabase = await createSupabaseServerClient();

  const matchQ = supabase
    .from("matches")
    .select(
      "id, kickoff_at, token_reward, status, result, home:teams!matches_home_team_id_fkey(name, logo_url), away:teams!matches_away_team_id_fkey(name, logo_url)",
    )
    .eq("id", id)
    .maybeSingle();

  // Also fetch worldcup activity rules + settings to show the admin-configured
  // rules and correct chance conditions (not a hardcoded fallback).
  const wcActivityQ = supabase
    .from("activities")
    .select("rules, settings")
    .eq("type", "worldcup_prediction")
    .eq("group_id", getGroupId())
    .maybeSingle();

  const [{ data: match }, predQ, chancesQ, { data: wcActivity }] = await Promise.all([
    matchQ,
    user
      ? supabase
          .from("predictions")
          .select("pick, is_correct, awarded")
          .eq("match_id", id)
          .eq("player_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null } as const),
    // Accumulated prediction chances — not tied to today's date
    user
      ? supabase.rpc("available_prediction_chances", { p_player: user.id })
      : Promise.resolve({ data: 0 } as const),
    wcActivityQ,
  ]);

  if (!match) notFound();

  // Read configurable chance conditions (fall back to defaults)
  const wcSettings = (wcActivity?.settings ?? {}) as Record<string, unknown>;
  const minRechargeAmount = (wcSettings.min_recharge_amount as number | undefined) ?? 500;
  const chancesPerRecharge = (wcSettings.chances_per_recharge as number | undefined) ?? 1;

  // Admin-configured rules text per locale (zh = top-level rules column;
  // en/ms fall back to that column if their translation is unset).
  // Falls back to the hardcoded i18n string only if no activity rules exist.
  const adminRules =
    locale === "zh"
      ? (wcActivity?.rules ?? null)
      : locale === "en"
        ? ((wcSettings.rules_en as string | undefined) ?? wcActivity?.rules ?? null)
        : ((wcSettings.rules_ms as string | undefined) ?? wcActivity?.rules ?? null);

  type TeamLite = { name: string; logo_url: string | null } | null;
  const home = oneOrNull(match.home) as TeamLite;
  const away = oneOrNull(match.away) as TeamLite;
  const pred = predQ?.data ?? null;
  const availableChances = typeof chancesQ.data === "number" ? chancesQ.data : 0;
  const now = Date.now();
  const kickoffMs = new Date(match.kickoff_at).getTime();
  const beforeKickoff = now < kickoffMs;
  const eligible = user ? availableChances > 0 : false;
  const canPredict =
    !!user && !pred && match.status === "scheduled" && beforeKickoff && eligible;

  return (
    <div className="space-y-5">
      <Link
        href="/matches"
        className="text-xs text-[var(--text-lo)] hover:text-[var(--text-mid)] transition inline-flex items-center gap-1"
      >
        {t("match_back")}
      </Link>

      <StadiumHero
        home={home}
        away={away}
        kickoffAt={match.kickoff_at}
        tokenReward={match.token_reward}
        status={match.status}
        result={match.result}
      />

      {/* Prediction zone */}
      {pred ? (
        <SubmittedCard
          pickName={pred.pick === "home" ? home?.name ?? t("predict_home") : away?.name ?? t("predict_away")}
          isCorrect={pred.is_correct}
          awarded={pred.awarded ?? 0}
          myPickLabel={t("match_my_pick")}
          pendingLabel={t("match_pending")}
          correctLabel={t("match_correct")}
          wrongLabel={t("match_wrong")}
          awardedLabel={t("match_awarded", { n: pred.awarded ?? 0 })}
        />
      ) : !user ? (
        <BlockedCard
          icon={<Lock size={18} />}
          title={t("match_blocked_login_title")}
          body={t("match_blocked_login_body", { amount: minRechargeAmount, chances: chancesPerRecharge })}
          actionHref="/login"
          actionLabel={t("match_blocked_login_btn")}
        />
      ) : !canPredict ? (
        <BlockedCard
          icon={
            match.status === "finished" ? (
              <CheckCircle2 size={18} />
            ) : !beforeKickoff || match.status === "locked" ? (
              <Lock size={18} />
            ) : (
              <Clock size={18} />
            )
          }
          title={
            match.status === "finished"
              ? t("match_blocked_finished")
              : match.status === "cancelled"
                ? t("match_blocked_cancelled")
                : match.status === "locked"
                  ? t("match_blocked_locked")
                  : !beforeKickoff
                    ? t("match_blocked_past")
                    : !eligible
                      ? t("match_blocked_recharge")
                      : t("match_blocked_default")
          }
          body={
            !eligible && match.status === "scheduled" && beforeKickoff
              ? t("match_blocked_recharge_body", { amount: minRechargeAmount, chances: chancesPerRecharge })
              : undefined
          }
        />
      ) : (
        <>
          {/* Remaining chances indicator */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-[var(--text-mid)]">竞猜机会剩余</span>
            <span className="text-sm font-bold text-[var(--gold-300)] tabular-nums">{availableChances} 次</span>
          </div>
          <PredictionForm
            matchId={match.id}
            homeName={home?.name ?? t("predict_home")}
            awayName={away?.name ?? t("predict_away")}
            tokenReward={match.token_reward}
            locale={locale}
          />
        </>
      )}
      {/* Rules */}
      <div className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-hi)]">
          <span>📋</span>
          {t("match_rules_title")}
        </div>
        <div className="text-sm text-[var(--text-mid)] whitespace-pre-line leading-relaxed">
          {adminRules ?? t("match_rules")}
        </div>
      </div>
    </div>
  );
}

function SubmittedCard({
  pickName,
  isCorrect,
  awarded,
  myPickLabel,
  pendingLabel,
  correctLabel,
  wrongLabel,
  awardedLabel,
}: {
  pickName: string;
  isCorrect: boolean | null;
  awarded: number;
  myPickLabel: string;
  pendingLabel: string;
  correctLabel: string;
  wrongLabel: string;
  awardedLabel: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-[var(--text-lo)]">{myPickLabel}</div>
        {isCorrect === null ? (
          <Chip variant="azure" className="inline-flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--azure-500)]"
              style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }}
            />
            {pendingLabel}
          </Chip>
        ) : isCorrect ? (
          <Chip variant="pitch" className="inline-flex items-center gap-1">
            <CheckCircle2 size={11} /> {correctLabel}
          </Chip>
        ) : (
          <Chip variant="crimson" className="inline-flex items-center gap-1">
            <XCircle size={11} /> {wrongLabel}
          </Chip>
        )}
      </div>
      <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--gold-300)]">
        {pickName}
      </div>
      {isCorrect === true && awarded > 0 && (
        <div className="text-sm text-[var(--pitch-400)] font-semibold">
          {awardedLabel}
        </div>
      )}
    </div>
  );
}

function BlockedCard({
  icon,
  title,
  body,
  actionHref,
  actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-5 flex flex-col items-center text-center gap-2">
      <div className="h-10 w-10 rounded-full bg-[var(--bg-raised)] text-[var(--text-mid)] flex items-center justify-center">
        {icon}
      </div>
      <div className="font-semibold text-[var(--text-hi)]">{title}</div>
      {body && <p className="text-sm text-[var(--text-mid)] max-w-xs">{body}</p>}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-2 h-9 px-5 inline-flex items-center rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] text-sm font-semibold hover:brightness-110 transition"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
