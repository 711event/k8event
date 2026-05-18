import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatMalaysia } from "@/lib/time/malaysia";
import type { RedemptionStatus } from "@/lib/supabase/types";

export const metadata = { title: "My redemptions · k8event" };

export default async function MyRedemptionsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  const { data: rows } = await supabase
    .from("redemption_requests")
    .select(
      "id, status, cost_at_request, note, created_at, decided_at, item:reward_items!redemption_requests_item_id_fkey(name, image_url)",
    )
    .eq("player_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">My redemptions</h1>

      {!rows?.length ? (
        <p className="text-zinc-500">
          No redemptions yet. Visit the <Link href="/shop" className="underline">shop</Link>.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const item = Array.isArray(r.item) ? r.item[0] : r.item;
            return (
              <li key={r.id} className="rounded-lg border border-foreground/10 p-4 flex items-center gap-4">
                <div className="h-14 w-14 rounded bg-foreground/[0.04] overflow-hidden flex-shrink-0">
                  {item?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item?.name ?? "—"}</div>
                  <div className="text-xs text-zinc-500">
                    Requested {formatMalaysia(r.created_at)} · {r.cost_at_request} tokens
                  </div>
                  <StatusTimeline status={r.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function StatusTimeline({ status }: { status: RedemptionStatus }) {
  const steps: { key: RedemptionStatus; label: string }[] = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "fulfilled", label: "Fulfilled" },
  ];

  if (status === "rejected") {
    return (
      <div className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
        Rejected · tokens refunded
      </div>
    );
  }

  const reachedIdx = steps.findIndex((s) => s.key === status);

  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs">
      {steps.map((s, i) => {
        const done = i <= reachedIdx;
        return (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (done ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-700")
              }
            />
            <span className={done ? "text-foreground" : "text-zinc-500"}>{s.label}</span>
            {i < steps.length - 1 && <span className="w-3 h-px bg-foreground/10" />}
          </div>
        );
      })}
    </div>
  );
}
