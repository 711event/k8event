"use client";

import { useReferralPending } from "./ReferralPendingProvider";

export function ReferralPendingBadge({ variant = "sidebar" }: { variant?: "sidebar" | "dot" }) {
  const { pendingCount } = useReferralPending();
  if (pendingCount === 0) return null;
  if (variant === "dot") {
    return (
      <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold tabular-nums ring-2 ring-zinc-900">
        {pendingCount > 99 ? "99+" : pendingCount}
      </span>
    );
  }
  return (
    <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums">
      {pendingCount > 99 ? "99+" : pendingCount}
    </span>
  );
}
