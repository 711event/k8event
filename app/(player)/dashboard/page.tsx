import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { malaysiaDateString } from "@/lib/time/malaysia";

export const metadata = { title: "Dashboard · k8event" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const today = malaysiaDateString();

  const [{ data: balanceRow }, { data: rechargeRow }] = await Promise.all([
    supabase.from("token_balances").select("balance").eq("player_id", user.id).maybeSingle(),
    supabase
      .from("daily_recharge")
      .select("amount")
      .eq("player_id", user.id)
      .eq("recharge_date", today)
      .maybeSingle(),
  ]);

  const balance = balanceRow?.balance ?? 0;
  const amountToday = Number(rechargeRow?.amount ?? 0);
  const eligible = amountToday >= 500;

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Welcome, {user.displayName}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-foreground/10 p-5">
          <div className="text-sm text-zinc-500">Token balance</div>
          <div className="text-4xl font-semibold mt-2 tabular-nums">{balance}</div>
        </div>
        <div className="rounded-lg border border-foreground/10 p-5">
          <div className="text-sm text-zinc-500">Today eligibility ({today})</div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium " +
                (eligible
                  ? "bg-green-500/15 text-green-600 dark:text-green-400"
                  : "bg-zinc-500/15 text-zinc-500")
              }
            >
              {eligible ? "Eligible" : "Not eligible"}
            </span>
            <span className="text-sm text-zinc-500">
              Recharge today: {amountToday.toFixed(2)} (need ≥ 500)
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        Match list, predictions, shop, and leaderboard arrive in the next phases.
      </p>
    </main>
  );
}
