import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { malaysiaDateString } from "@/lib/time/malaysia";

export const metadata = { title: "Admin · k8event" };

export default async function AdminHomePage() {
  const supabase = await createSupabaseServerClient();
  const today = malaysiaDateString();

  const [playersCount, todayEligibleCount, pendingRedemptions, openChats] = await Promise.all([
    supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("role", "player"),
    supabase
      .from("daily_recharge")
      .select("player_id", { count: "exact", head: true })
      .eq("recharge_date", today)
      .gte("amount", 500),
    supabase
      .from("redemption_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("chat_threads")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "claimed"]),
  ]);

  const cards = [
    { label: "Total players", value: playersCount.count ?? 0, href: "/admin/players" },
    { label: `Eligible today (${today})`, value: todayEligibleCount.count ?? 0, href: "/admin/recharge" },
    { label: "Pending redemptions", value: pendingRedemptions.count ?? 0, href: "/admin/redemptions" },
    { label: "Open chats", value: openChats.count ?? 0, href: "/admin/chat" },
  ];

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="block p-5 rounded-lg border border-foreground/10 hover:border-foreground/30 transition-colors"
          >
            <div className="text-sm text-zinc-500">{c.label}</div>
            <div className="text-3xl font-semibold mt-2">{c.value}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
