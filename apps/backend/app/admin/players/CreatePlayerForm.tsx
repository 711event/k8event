"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { createPlayerAction, type CreatePlayerState } from "./actions";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";

export function CreatePlayerForm() {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1]) => tBo(locale, k);
  const [state, formAction, pending] = useActionState<CreatePlayerState, FormData>(
    createPlayerAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  const credentials =
    state && "ok" in state && state.ok
      ? `${t("create_player_form_user_label")} ${state.username}\n${t("create_player_form_pw_label")} ${state.password}`
      : null;

  async function copyCredentials() {
    if (!credentials) return;
    await navigator.clipboard.writeText(credentials);
    setCopied(true);
    toast.success(t("player_row_copied"));
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1.5 text-sm flex-1 min-w-[160px]">
          <span className="font-medium">{t("create_player_form_username")}</span>
          <input
            name="username"
            type="text"
            placeholder={t("create_player_form_username_hint")}
            required
            autoComplete="off"
            className="h-10 px-3 rounded-md border border-zinc-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground/20 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm w-40">
          <span className="font-medium">{t("create_player_form_display")}</span>
          <input
            name="displayName"
            type="text"
            placeholder={t("create_player_form_display_hint")}
            className="h-10 px-3 rounded-md border border-zinc-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground/20 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm w-40">
          <span className="font-medium">{t("create_player_form_contact")}</span>
          <input
            name="phone"
            type="tel"
            placeholder={t("create_player_form_contact_hint")}
            className="h-10 px-3 rounded-md border border-zinc-300 bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground/20 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-6 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 font-medium disabled:opacity-60 text-sm"
        >
          {pending ? t("create_player_form_creating") : t("create_player_form_create")}
        </button>
        {state && "error" in state && (
          <p className="w-full text-sm text-red-600">{state.error}</p>
        )}
      </form>

      {/* Credentials card shown after creation */}
      {credentials && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-1.5">{t("create_player_form_success")}</p>
            <p className="font-mono text-sm text-zinc-800">{t("create_player_form_user_label")} <strong>{(state as {ok:true;username:string;password:string}).username}</strong></p>
            <p className="font-mono text-sm text-zinc-800">{t("create_player_form_pw_label")} <strong>{(state as {ok:true;username:string;password:string}).password}</strong></p>
            <p className="text-xs text-zinc-500 mt-1">{t("create_player_form_pw_note")}</p>
          </div>
          <button
            type="button"
            onClick={copyCredentials}
            className="flex-shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-md border border-emerald-300 bg-white hover:bg-emerald-50 text-sm font-medium text-emerald-700 transition"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t("create_player_form_copied") : t("create_player_form_copy")}
          </button>
        </div>
      )}
    </div>
  );
}
