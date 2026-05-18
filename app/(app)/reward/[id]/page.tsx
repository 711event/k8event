import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RedeemButton } from "./RedeemButton";

export const metadata = { title: "Reward · k8event" };

export default async function ShopItemPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  const [{ data: item }, { data: balance }] = await Promise.all([
    supabase
      .from("reward_items")
      .select("id, name, description, image_url, cost, stock, is_active")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("token_balances").select("balance").eq("player_id", user.id).maybeSingle(),
  ]);

  if (!item || !item.is_active) notFound();

  const myBalance = balance?.balance ?? 0;
  const outOfStock = item.stock === 0;
  const affordable = myBalance >= item.cost;
  const canRedeem = !outOfStock && affordable;

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/reward" className="text-sm text-zinc-500 hover:underline">← 奖励商城</Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="aspect-square rounded-lg bg-foreground/[0.04] overflow-hidden">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-zinc-500">No image</div>
          )}
        </div>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">{item.name}</h1>
          {item.description && <p className="text-zinc-600 dark:text-zinc-400">{item.description}</p>}
          <div className="rounded-md border border-foreground/10 p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Cost</span>
              <span className="font-semibold">{item.cost} tokens</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Stock</span>
              <span>{item.stock === -1 ? "Unlimited" : item.stock}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Your balance</span>
              <span className="tabular-nums">{myBalance}</span>
            </div>
          </div>

          {canRedeem ? (
            <RedeemButton id={item.id} name={item.name} cost={item.cost} />
          ) : (
            <div className="rounded-md border border-foreground/10 p-3 text-sm text-zinc-500">
              {outOfStock
                ? "This item is out of stock."
                : `You need ${item.cost - myBalance} more tokens.`}
            </div>
          )}

          <p className="text-xs text-zinc-500">
            Redeeming deducts tokens immediately. Rewards are fulfilled offline by an admin; you can
            track status under{" "}
            <Link href="/redemptions" className="underline">My redemptions</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
