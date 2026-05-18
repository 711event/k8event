import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { AvatarMenu } from "./AvatarMenu";

export async function PlayerHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/85 backdrop-blur-md">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
        <Link href="/event" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--gold-300)] to-[var(--gold-600)] font-[family-name:var(--font-display)] text-[var(--text-on-gold)] font-bold text-sm">
            K
          </span>
          <span className="font-[family-name:var(--font-display)] font-bold text-[var(--text-hi)] tracking-tight">
            k8event
          </span>
        </Link>
        {user ? (
          <AvatarMenu displayName={user.displayName} username={user.username ?? ""} />
        ) : (
          <Link
            href="/login"
            className="h-9 px-4 inline-flex items-center rounded-full bg-gradient-to-b from-[var(--gold-300)] to-[var(--gold-500)] text-[var(--text-on-gold)] text-sm font-semibold shadow-[0_0_0_1px_rgba(255,200,87,.4)] hover:brightness-110 transition"
          >
            登录
          </Link>
        )}
      </div>
    </header>
  );
}
