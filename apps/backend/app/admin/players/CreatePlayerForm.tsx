"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createPlayerAction, type CreatePlayerState } from "./actions";

export function CreatePlayerForm() {
  const [state, formAction, pending] = useActionState<CreatePlayerState, FormData>(
    createPlayerAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      toast.success(`玩家 "${state.username}" 已创建`);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
      <Field name="username" label="用户名" placeholder="字母/数字/下划线" />
      <Field name="password" label="密码" type="password" placeholder="最少 8 位" />
      <Field name="displayName" label="显示名称" placeholder="（可选）" required={false} />
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 font-medium disabled:opacity-60"
      >
        {pending ? "创建中…" : "创建"}
      </button>
      {state && "error" in state && (
        <p className="sm:col-span-4 text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="h-10 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground/20"
      />
    </label>
  );
}
