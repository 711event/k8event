"use client";

import { useChatUnread } from "./ChatUnreadProvider";

export function ChatUnreadBadge({ variant = "sidebar" }: { variant?: "sidebar" | "dot" }) {
  const { unreadCount } = useChatUnread();
  if (unreadCount === 0) return null;
  if (variant === "dot") {
    return (
      <span
        aria-label={`${unreadCount} 条未读消息`}
        className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold tabular-nums ring-2 ring-zinc-900"
      >
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    );
  }
  return (
    <span
      aria-label={`${unreadCount} 条未读消息`}
      className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums"
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
