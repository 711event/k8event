"use client";

import { useTransition } from "react";
import { signOutAction } from "@/app/login/actions";

export function SignOutButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => signOutAction())}
      disabled={pending}
      className={
        className ??
        "text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors disabled:opacity-60"
      }
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
