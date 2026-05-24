"use client";

import { useRef, useState, useTransition } from "react";
import { updateBrandingAction, removeLogo } from "./actions";
import type { GroupBranding } from "@/lib/get-branding";

export function BrandSettingsForm({ branding }: { branding: GroupBranding }) {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => { void updateBrandingAction(fd); });
  }

  function handleRemoveLogo() {
    startTransition(() => { void removeLogo(); });
    setPreview(null);
  }

  const currentLogo = preview ?? branding.logo_url;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5">
      {/* Current logo preview */}
      <div>
        <div className="text-xs font-medium text-zinc-600 mb-2">当前 Logo</div>
        <div className="h-16 w-48 rounded border border-zinc-200 bg-zinc-50 flex items-center justify-center overflow-hidden">
          {currentLogo ? (
            <img src={currentLogo} alt="logo" className="h-full w-full object-contain p-1" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-gradient-to-br from-amber-300 to-amber-500 text-zinc-950 font-bold text-[10px]">711</span>
              <span className="text-sm font-semibold text-zinc-700">{branding.company_name}</span>
            </div>
          )}
        </div>
        {branding.logo_url && !preview && (
          <button
            type="button"
            onClick={handleRemoveLogo}
            disabled={isPending}
            className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
          >
            移除 Logo，恢复默认
          </button>
        )}
      </div>

      {/* Company name */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">公司名称</label>
        <input
          name="company_name"
          defaultValue={branding.company_name}
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder="711event"
        />
      </div>

      {/* Logo upload */}
      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">上传 Logo（170×85 px，PNG/WebP）</label>
        <input
          ref={fileRef}
          name="logo_file"
          type="file"
          accept="image/png,image/webp,image/jpeg,image/svg+xml"
          onChange={handleFileChange}
          className="block w-full text-sm text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
        />
        <p className="text-[11px] text-zinc-400 mt-1">建议透明背景 PNG，宽高比约 2:1</p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-10 rounded bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition"
      >
        {isPending ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
