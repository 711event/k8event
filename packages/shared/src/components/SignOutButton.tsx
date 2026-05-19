"use client";

import { useTransition } from "react";
import { signOutAction } from "../auth/sign-out";

export function SignOutButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => signOutAction())}
      disabled={pending}
      className={
        className ??
        "text-sm text-zinc-600 hover:text-zinc-900 transition-colors disabled:opacity-60"
      }
    >
      {pending ? "退出中…" : "退出"}
    </button>
  );
}
