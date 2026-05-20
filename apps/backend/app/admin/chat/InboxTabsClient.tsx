"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useChatUnread } from "@/components/admin/ChatUnreadProvider";

type TabKey = "open" | "pending" | "closed" | "all";

export function InboxTabsClient({
  active,
  openCount,
  pendingCount,
}: {
  active: TabKey;
  openCount: number;
  pendingCount: number;
}) {
  const { pendingHasNew, clearPendingNew } = useChatUnread();
  const pathname = usePathname();

  // Clear pending flash when user is on the pending tab
  useEffect(() => {
    if (active === "pending") clearPendingNew();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "open", label: "未处理" },
    { key: "pending", label: "跟进中" },
    { key: "closed", label: "已关闭" },
    { key: "all", label: "全部" },
  ];

  return (
    <div className="flex gap-2 border-b border-zinc-200">
      {tabs.map((t) => {
        const isActive = active === t.key;
        const count = t.key === "open" ? openCount : t.key === "pending" ? pendingCount : 0;
        const flash = t.key === "pending" && pendingHasNew && !isActive;

        return (
          <Link
            key={t.key}
            href={`/admin/chat?status=${t.key}`}
            onClick={t.key === "pending" ? clearPendingNew : undefined}
            className={
              "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium -mb-px border-b-2 transition " +
              (isActive
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900")
            }
          >
            {t.label}
            {count > 0 && (
              <span
                className={
                  "inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full text-white text-[10px] font-bold leading-none " +
                  (t.key === "pending"
                    ? "bg-blue-500 " + (flash ? "animate-pulse" : "")
                    : "bg-red-500")
                }
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
