import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Shop · k8event" };

export default async function ShopPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  const [{ data: items }, { data: balance }] = await Promise.all([
    supabase
      .from("reward_items")
      .select("id, name, description, image_url, cost, stock, is_active")
      .eq("is_active", true)
      .order("cost"),
    supabase.from("token_balances").select("balance").eq("player_id", user.id).maybeSingle(),
  ]);

  const myBalance = balance?.balance ?? 0;

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reward shop</h1>
        <div className="text-sm">
          <span className="text-zinc-500">Your balance: </span>
          <span className="font-semibold tabular-nums">{myBalance}</span> tokens
        </div>
      </div>

      {!items?.length ? (
        <p className="text-zinc-500">No rewards available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => {
            const outOfStock = it.stock === 0;
            const affordable = myBalance >= it.cost;
            return (
              <Link
                key={it.id}
                href={`/shop/${it.id}`}
                className="block rounded-lg border border-foreground/10 hover:border-foreground/30 transition-colors overflow-hidden"
              >
                <div className="aspect-[4/3] bg-foreground/[0.04] overflow-hidden">
                  {it.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-zinc-500 text-sm">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="font-medium truncate">{it.name}</div>
                  {it.description && (
                    <div className="text-xs text-zinc-500 line-clamp-2">{it.description}</div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold tabular-nums">{it.cost} tokens</span>
                    <span
                      className={
                        "text-xs px-2 py-0.5 rounded-full " +
                        (outOfStock
                          ? "bg-zinc-500/15 text-zinc-500"
                          : !affordable
                            ? "bg-red-500/15 text-red-600 dark:text-red-400"
                            : "bg-green-500/15 text-green-600 dark:text-green-400")
                      }
                    >
                      {outOfStock ? "out of stock" : !affordable ? "insufficient" : "redeem"}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
