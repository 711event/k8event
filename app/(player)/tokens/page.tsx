import { getCurrentUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMalaysia } from "@/lib/time/malaysia";

export const metadata = { title: "Tokens · k8event" };

export default async function TokensPage() {
  const user = await getCurrentUser();
  if (!user) return null;
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

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Tokens</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-foreground/10 p-5">
          <div className="text-sm text-zinc-500">Current balance</div>
          <div className="text-4xl font-semibold mt-2 tabular-nums">{balance}</div>
        </div>
        <div className="rounded-lg border border-foreground/10 p-5">
          <div className="text-sm text-zinc-500">All-time earned</div>
          <div className="text-4xl font-semibold mt-2 tabular-nums">{earned}</div>
        </div>
      </div>

      <section className="rounded-lg border border-foreground/10 overflow-x-auto">
        <h2 className="px-5 py-3 text-lg font-medium border-b border-foreground/10">Transactions</h2>
        <table className="w-full text-sm">
          <thead className="bg-foreground/[0.03] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">When (GMT+8)</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium text-right">Delta</th>
              <th className="px-4 py-3 font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/10">
            {!tx?.length ? (
              <tr><td colSpan={4} className="px-4 py-6 text-zinc-500">No transactions yet.</td></tr>
            ) : (
              tx.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{formatMalaysia(t.created_at)}</td>
                  <td className="px-4 py-3">{t.reason}</td>
                  <td className={"px-4 py-3 text-right tabular-nums font-medium " + (t.delta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                    {t.delta > 0 ? `+${t.delta}` : t.delta}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{t.note ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
