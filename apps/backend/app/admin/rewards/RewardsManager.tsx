"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";
import {
  createRewardAction,
  deleteRewardAction,
  toggleRewardActiveAction,
  type RewardFormState,
} from "./actions";

type Item = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cost: number;
  stock: number;
  is_active: boolean;
};

export function RewardsManager({ items }: { items: Item[] }) {
  const { locale } = useLang();
  const [state, formAction, pending] = useActionState<RewardFormState, FormData>(
    createRewardAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      toast.success(tBo(locale, "rewards_created"));
      formRef.current?.reset();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state, locale]);

  return (
    <>
      <section className="rounded-lg border border-zinc-200 p-5 space-y-3">
        <h2 className="text-lg font-medium">{tBo(locale, "rewards_add")}</h2>
        <form ref={formRef} action={formAction} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <Field name="name" label={tBo(locale, "rewards_field_name")} placeholder={tBo(locale, "rewards_field_name_hint")} className="md:col-span-2" />
          <Field name="cost" label={tBo(locale, "rewards_field_cost")} type="number" placeholder="1000" />
          <Field name="stock" label={tBo(locale, "rewards_field_stock")} type="number" placeholder="-1" />
          <Field name="imageUrl" label={tBo(locale, "rewards_field_image")} placeholder="https://..." required={false} className="md:col-span-2" />
          <Field name="description" label={tBo(locale, "rewards_field_desc")} placeholder={tBo(locale, "rewards_desc_hint")} required={false} className="md:col-span-5" />
          <button
            type="submit"
            disabled={pending}
            className="h-10 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 font-medium disabled:opacity-60"
          >
            {pending ? tBo(locale, "rewards_saving") : tBo(locale, "rewards_create_btn")}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">{tBo(locale, "rewards_col_name")}</th>
              <th className="px-4 py-3 font-medium text-right">{tBo(locale, "rewards_col_cost")}</th>
              <th className="px-4 py-3 font-medium text-right">{tBo(locale, "rewards_col_stock")}</th>
              <th className="px-4 py-3 font-medium">{tBo(locale, "rewards_col_status")}</th>
              <th className="px-4 py-3 font-medium w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-zinc-500">{tBo(locale, "rewards_empty")}</td></tr>
            ) : (
              items.map((it) => <RewardRow key={it.id} item={it} />)
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}

function RewardRow({ item }: { item: Item }) {
  const { locale } = useLang();
  const [pending, startTransition] = useTransition();
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {item.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image_url} alt="" className="h-10 w-10 rounded object-cover" />
          ) : (
            <div className="h-10 w-10 rounded bg-foreground/10" />
          )}
          <div className="min-w-0">
            <div className="font-medium">{item.name}</div>
            {item.description && (
              <div className="text-xs text-zinc-500 truncate max-w-md">{item.description}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{item.cost}</td>
      <td className="px-4 py-3 text-right tabular-nums">
        {item.stock === -1 ? <span className="text-zinc-500">∞</span> : item.stock}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const r = await toggleRewardActiveAction(item.id, !item.is_active);
              if (r && "error" in r) toast.error(r.error);
              else toast.success(item.is_active ? tBo(locale, "rewards_toggled_inactive") : tBo(locale, "rewards_toggled_active"));
            });
          }}
          className={
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium disabled:opacity-60 " +
            (item.is_active
              ? "bg-green-500/15 text-green-600"
              : "bg-zinc-500/15 text-zinc-500")
          }
        >
          {item.is_active ? tBo(locale, "rewards_active") : tBo(locale, "rewards_inactive")}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(tBo(locale, "rewards_delete_confirm", { name: item.name }))) return;
            startTransition(async () => {
              const r = await deleteRewardAction(item.id);
              if (r && "error" in r) toast.error(r.error);
              else toast.success(tBo(locale, "rewards_deleted"));
            });
          }}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          {tBo(locale, "rewards_delete_btn")}
        </button>
      </td>
    </tr>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required = true,
  className,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={"flex flex-col gap-1.5 text-sm " + (className ?? "")}>
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
