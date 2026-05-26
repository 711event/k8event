"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@k8event/shared/supabase/client";
import {
  createQuickReplyAction,
  deleteQuickReplyAction,
  toggleQuickReplyAction,
  updateQuickReplyAction,
  type QRState,
} from "./actions";
import { useLang } from "@/components/admin/LangProvider";
import { tBo } from "@/lib/i18n";

type QR = {
  id: string;
  title: string;
  body: string;
  sort_order: number;
  is_active: boolean;
  image_url?: string | null;
};

const isButton = (title: string) => title.trim().startsWith("++");

export function QuickRepliesManager({ replies }: { replies: QR[] }) {
  const { locale } = useLang();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const [modalState, setModalState] = useState<{ mode: "create" } | { mode: "edit"; qr: QR } | null>(null);

  return (
    <>
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="px-5 py-3 flex items-center justify-between border-b border-zinc-200">
          <div className="text-sm text-zinc-500">{t("quick_replies_count", { count: replies.length })}</div>
          <button
            type="button"
            onClick={() => setModalState({ mode: "create" })}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={15} />
            {t("quick_replies_create")}
          </button>
        </div>

        {replies.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-zinc-500">
            {t("quick_replies_empty")} · {t("quick_replies_empty3")}
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {replies.map((qr) => (
              <QRRow key={qr.id} qr={qr} locale={locale} onEdit={() => setModalState({ mode: "edit", qr })} />
            ))}
          </ul>
        )}
      </div>

      {modalState && (
        <QRModal
          mode={modalState.mode}
          qr={modalState.mode === "edit" ? modalState.qr : undefined}
          locale={locale}
          onClose={() => setModalState(null)}
        />
      )}
    </>
  );
}

function QRRow({ qr, locale, onEdit }: { qr: QR; locale: import("@/lib/i18n").BoLocale; onEdit: () => void }) {
  const [delPending, startDel] = useTransition();
  const [togglePending, startToggle] = useTransition();
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const button = isButton(qr.title);

  return (
    <li
      className={
        "px-5 py-3 flex items-start gap-3 transition " +
        (qr.is_active ? "" : "opacity-60")
      }
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={
              "font-mono text-sm font-semibold " +
              (button ? "text-blue-600" : "text-zinc-900")
            }
          >
            {qr.title}
          </span>
          {button && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
              {t("quick_replies_chip")}
            </span>
          )}
        </div>
        <div className="text-sm text-zinc-600 mt-0.5 whitespace-pre-wrap break-words line-clamp-3">
          {qr.body}
        </div>
        {qr.image_url && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={qr.image_url}
            alt={t("quick_replies_attach")}
            className="mt-1.5 h-12 w-12 rounded object-cover border border-zinc-200"
          />
        )}
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          type="button"
          aria-label={qr.is_active ? t("quick_replies_disable") : t("quick_replies_enable")}
          title={qr.is_active ? t("quick_replies_disable") : t("quick_replies_enable")}
          disabled={togglePending}
          onClick={() =>
            startToggle(async () => {
              const r = await toggleQuickReplyAction(qr.id, !qr.is_active);
              if (r && "error" in r) toast.error(r.error);
            })
          }
          className={
            "h-8 w-8 rounded inline-flex items-center justify-center transition disabled:opacity-50 " +
            (qr.is_active
              ? "text-emerald-600 hover:bg-emerald-50"
              : "text-zinc-400 hover:bg-zinc-100")
          }
        >
          {qr.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button
          type="button"
          aria-label={t("quick_replies_edit")}
          title={t("quick_replies_edit")}
          onClick={onEdit}
          className="h-8 w-8 rounded inline-flex items-center justify-center text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          aria-label={t("quick_replies_delete")}
          title={t("quick_replies_delete")}
          disabled={delPending}
          onClick={() => {
            if (!confirm(t("quick_replies_delete_confirm", { title: qr.title }))) return;
            startDel(async () => {
              const r = await deleteQuickReplyAction(qr.id);
              if (r && "error" in r) toast.error(r.error);
              else toast.success(t("quick_replies_deleted"));
            });
          }}
          className="h-8 w-8 rounded inline-flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 transition disabled:opacity-50"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </li>
  );
}

function QRModal({
  mode,
  qr,
  locale,
  onClose,
}: {
  mode: "create" | "edit";
  qr?: QR;
  locale: import("@/lib/i18n").BoLocale;
  onClose: () => void;
}) {
  const t = (k: Parameters<typeof tBo>[1], vars?: Record<string, string | number>) => tBo(locale, k, vars);
  const boundAction =
    mode === "edit" && qr
      ? (prev: QRState, fd: FormData) => updateQuickReplyAction(qr.id, prev, fd)
      : createQuickReplyAction;

  const [state, formAction, pending] = useActionState<QRState, FormData>(boundAction, undefined);
  const [isActive, setIsActive] = useState(qr?.is_active ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(qr?.image_url ?? null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      toast.success(mode === "edit" ? t("quick_replies_saved") : t("quick_replies_added"));
      onClose();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleImageFile(file: File) {
    setImageUploading(true);
    try {
      const sb = createSupabaseBrowserClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `quick-replies/${crypto.randomUUID()}.${ext}`;
      const { error } = await sb.storage.from("chat-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = sb.storage.from("chat-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("quick_replies_upload_failed"));
    } finally {
      setImageUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <button
        type="button"
        aria-label={t("quick_replies_cancel")}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="px-5 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900">
            {mode === "edit" ? t("quick_replies_edit_title") : t("quick_replies_new_title")}
          </h2>
        </div>
        <form action={formAction} className="px-5 py-4 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">
              {t("quick_replies_field_title")} <span className="text-xs text-zinc-400 ml-1">{t("quick_replies_field_title_hint")}</span>
            </span>
            <input
              name="title"
              required
              defaultValue={qr?.title ?? ""}
              maxLength={80}
              placeholder={t("quick_replies_field_title_placeholder")}
              className="mt-1.5 w-full h-10 px-3 rounded-md border border-zinc-300 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">{t("quick_replies_field_body")}</span>
            <textarea
              name="body"
              required
              defaultValue={qr?.body ?? ""}
              rows={4}
              maxLength={2000}
              className="mt-1.5 w-full px-3 py-2 rounded-md border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </label>

          {/* Image attachment */}
          <div>
            <span className="text-sm font-medium text-zinc-700">
              {t("quick_replies_field_image")} <span className="text-xs font-normal text-zinc-400">{t("quick_replies_field_image_note")}</span>
            </span>
            <div className="mt-1.5 flex items-start gap-2">
              {imageUrl ? (
                <div className="relative flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={t("quick_replies_field_image")}
                    className="h-20 w-20 rounded-lg object-cover border border-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-zinc-900 text-white flex items-center justify-center shadow"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="h-20 w-20 rounded-lg border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:border-blue-400 hover:text-blue-500 transition disabled:opacity-60"
                >
                  {imageUploading ? (
                    <span className="text-[10px]">{t("quick_replies_uploading")}</span>
                  ) : (
                    <>
                      <ImagePlus size={18} />
                      <span className="text-[10px]">{t("quick_replies_add_image")}</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImageFile(f);
                  e.target.value = "";
                }}
              />
            </div>
            {/* Pass image_url as hidden field so the server action receives it */}
            <input type="hidden" name="image_url" value={imageUrl ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">{t("quick_replies_field_sort")}</span>
              <input
                name="sort_order"
                type="number"
                defaultValue={qr?.sort_order ?? 0}
                className="mt-1.5 w-full h-10 px-3 rounded-md border border-zinc-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </label>
            <label className="inline-flex h-10 items-center justify-center gap-2 px-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium cursor-pointer hover:bg-emerald-100 transition select-none">
              <input
                type="checkbox"
                name="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only"
              />
              {isActive ? <Eye size={15} /> : <EyeOff size={15} />}
              {isActive ? t("quick_replies_active") : t("quick_replies_inactive")}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="h-9 px-4 rounded-md border border-zinc-300 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {t("quick_replies_cancel")}
            </button>
            <button
              type="submit"
              disabled={pending || imageUploading}
              className="h-9 px-4 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? t("quick_replies_saving") : t("quick_replies_save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
