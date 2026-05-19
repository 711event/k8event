import Link from "next/link";
import { notFound } from "next/navigation";
import { Coins, Gift, Package, Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RedeemButton } from "./RedeemButton";

export const metadata = { title: "奖品详情 · 711event" };
export const dynamic = "force-dynamic";

export default async function RewardItemPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  const [{ data: item }, balanceRes] = await Promise.all([
    supabase
      .from("reward_items")
      .select("id, name, description, image_url, cost, stock, is_active")
      .eq("id", id)
      .maybeSingle(),
    user
      ? supabase.from("token_balances").select("balance").eq("player_id", user.id).maybeSingle()
      : Promise.resolve({ data: null } as const),
  ]);

  if (!item || !item.is_active) notFound();

  const myBalance = user ? balanceRes?.data?.balance ?? 0 : 0;
  const outOfStock = item.stock === 0;
  const affordable = myBalance >= item.cost;
  const canRedeem = !!user && !outOfStock && affordable;

  return (
    <div className="space-y-5">
      <Link
        href="/reward"
        className="text-xs text-[var(--text-lo)] hover:text-[var(--text-mid)] transition inline-flex items-center gap-1"
      >
        ← 返回奖励中心
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="aspect-square rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-strong)] overflow-hidden relative">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[var(--text-lo)]">
              <Gift size={64} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[var(--text-hi)]">
            {item.name}
          </h1>
          {item.description && (
            <p className="text-sm text-[var(--text-mid)] leading-relaxed">{item.description}</p>
          )}

          <div className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4 space-y-2.5">
            <Row
              icon={<Coins size={14} className="text-[var(--gold-300)]" />}
              label="兑换价"
              value={
                <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--gold-300)] tabular-nums">
                  {item.cost.toLocaleString()}
                </span>
              }
            />
            <Row
              icon={<Package size={14} className="text-[var(--text-lo)]" />}
              label="库存"
              value={
                <span className="text-sm text-[var(--text-hi)]">
                  {item.stock === -1 ? "无限" : item.stock === 0 ? "已售罄" : item.stock}
                </span>
              }
            />
            {user && (
              <Row
                icon={<Coins size={14} className="text-[var(--text-lo)]" />}
                label="我的余额"
                value={
                  <span className="text-sm text-[var(--text-hi)] tabular-nums">
                    {myBalance.toLocaleString()}
                  </span>
                }
              />
            )}
          </div>

          {!user ? (
            <Link
              href="/login"
              className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--gold-500)]/50 bg-[var(--bg-elevated)] text-[var(--gold-300)] text-sm font-semibold hover:bg-[var(--bg-raised)] transition"
            >
              <Lock size={14} />
              登录后兑换
            </Link>
          ) : canRedeem ? (
            <RedeemButton id={item.id} name={item.name} cost={item.cost} />
          ) : (
            <div className="w-full h-12 inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-lo)] text-sm">
              {outOfStock
                ? "本商品已售罄"
                : `还差 ${(item.cost - myBalance).toLocaleString()} Token`}
            </div>
          )}

          <p className="text-[11px] text-[var(--text-lo)] leading-relaxed">
            兑换后会立即扣减 Token,奖励由客服线下发放。可在{" "}
            <Link href="/redemptions" className="text-[var(--gold-300)] hover:underline">
              兑换记录
            </Link>
            {" "}追踪状态。
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-[var(--text-mid)]">
        {icon}
        {label}
      </div>
      {value}
    </div>
  );
}
