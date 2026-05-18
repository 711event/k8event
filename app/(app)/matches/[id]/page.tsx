import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, Lock, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { malaysiaDateString } from "@/lib/time/malaysia";
import { StadiumHero } from "@/components/player/StadiumHero";
import { Chip } from "@/components/player/Chip";
import { PredictionForm } from "./PredictionForm";

export const metadata = { title: "比赛详情 · k8event" };
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
  const supabase = await createSupabaseServerClient();

  const matchQ = supabase
    .from("matches")
    .select(
      "id, kickoff_at, token_reward, status, result, home:teams!matches_home_team_id_fkey(name, logo_url), away:teams!matches_away_team_id_fkey(name, logo_url)",
    )
    .eq("id", id)
    .maybeSingle();

  const [{ data: match }, predQ, rechargeQ] = await Promise.all([
    matchQ,
    user
      ? supabase
          .from("predictions")
          .select("pick, is_correct, awarded")
          .eq("match_id", id)
          .eq("player_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null } as const),
    user
      ? supabase
          .from("daily_recharge")
          .select("amount")
          .eq("player_id", user.id)
          .eq("recharge_date", malaysiaDateString())
          .maybeSingle()
      : Promise.resolve({ data: null } as const),
  ]);

  if (!match) notFound();

  type TeamLite = { name: string; logo_url: string | null } | null;
  const home = oneOrNull(match.home) as TeamLite;
  const away = oneOrNull(match.away) as TeamLite;
  const pred = predQ?.data ?? null;
  const recharge = rechargeQ?.data ?? null;
  const now = Date.now();
  const kickoffMs = new Date(match.kickoff_at).getTime();
  const beforeKickoff = now < kickoffMs;
  const eligible = user ? Number(recharge?.amount ?? 0) >= 500 : false;
  const canPredict =
    !!user && !pred && match.status === "scheduled" && beforeKickoff && eligible;

  return (
    <div className="space-y-5">
      <Link
        href="/matches"
        className="text-xs text-[var(--text-lo)] hover:text-[var(--text-mid)] transition inline-flex items-center gap-1"
      >
        ← 返回赛程
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
          pickName={pred.pick === "home" ? home?.name ?? "主队" : away?.name ?? "客队"}
          isCorrect={pred.is_correct}
          awarded={pred.awarded ?? 0}
        />
      ) : !user ? (
        <BlockedCard
          icon={<Lock size={18} />}
          title="登录后即可预测"
          body="登录账号后,确认今日充值已满 500 即可参与本场竞猜。"
          actionHref={`/login`}
          actionLabel="去登录"
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
              ? "本场已结束"
              : match.status === "cancelled"
                ? "本场已取消"
                : match.status === "locked"
                  ? "本场已锁定竞猜"
                  : !beforeKickoff
                    ? "已超过开赛时间"
                    : !eligible
                      ? "今日充值未达 500"
                      : "暂不可竞猜"
          }
          body={
            !eligible && match.status === "scheduled" && beforeKickoff
              ? "完成今日 500 充值后即可参与竞猜。"
              : undefined
          }
        />
      ) : (
        <PredictionForm
          matchId={match.id}
          homeName={home?.name ?? "主队"}
          awayName={away?.name ?? "客队"}
          tokenReward={match.token_reward}
        />
      )}
    </div>
  );
}

function SubmittedCard({
  pickName,
  isCorrect,
  awarded,
}: {
  pickName: string;
  isCorrect: boolean | null;
  awarded: number;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-[var(--text-lo)]">我的预测</div>
        {isCorrect === null ? (
          <Chip variant="azure" className="inline-flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--azure-500)]"
              style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }}
            />
            等待结算
          </Chip>
        ) : isCorrect ? (
          <Chip variant="pitch" className="inline-flex items-center gap-1">
            <CheckCircle2 size={11} /> 猜对了
          </Chip>
        ) : (
          <Chip variant="crimson" className="inline-flex items-center gap-1">
            <XCircle size={11} /> 猜错了
          </Chip>
        )}
      </div>
      <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--gold-300)]">
        {pickName}
      </div>
      {isCorrect === true && awarded > 0 && (
        <div className="text-sm text-[var(--pitch-400)] font-semibold">
          +{awarded} Token 已入账
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
