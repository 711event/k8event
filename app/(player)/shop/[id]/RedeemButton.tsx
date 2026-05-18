"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { redeemAction } from "./actions";

export function RedeemButton({ id, name, cost }: { id: string; name: string; cost: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Redeem "${name}" for ${cost} tokens?`)) return;
        startTransition(async () => {
          const r = await redeemAction(id);
          if (r && "error" in r) {
            toast.error(r.error);
            return;
          }
          toast.success("Redemption requested!");
          router.push("/redemptions");
        });
      }}
      className="w-full h-12 rounded-md bg-foreground text-background font-medium disabled:opacity-60"
    >
      {pending ? "Redeeming…" : `Redeem · ${cost} tokens`}
    </button>
  );
}
