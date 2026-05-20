"use client";

import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Paperclip, Plus } from "lucide-react";

export function AttachMenu({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void | Promise<void>;
  disabled?: boolean;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setOpen(false);
    if (files.length) void onFiles(files);
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="h-10 w-10 rounded-full border border-[var(--border-strong)] bg-[var(--bg-raised)] flex items-center justify-center text-[var(--text-mid)] hover:border-[var(--gold-500)]/60 hover:text-[var(--gold-300)] disabled:opacity-60 transition"
        aria-label="附件"
      >
        <Plus size={18} />
      </button>

      {open && (
        <>
          {/* Backdrop to close menu */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Popup — sits directly above the + button */}
          <div className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-40 rounded-xl overflow-hidden shadow-xl"
            style={{ border: "1px solid rgba(255,255,255,0.15)", background: "#1c1c1e" }}
          >
            <MenuItem
              icon={<Camera size={15} />}
              label="相机"
              onClick={() => { setOpen(false); cameraRef.current?.click(); }}
            />
            <MenuItem
              icon={<ImageIcon size={15} />}
              label="选相册"
              onClick={() => { setOpen(false); galleryRef.current?.click(); }}
            />
            <MenuItem
              icon={<Paperclip size={15} />}
              label="选文件"
              onClick={() => { setOpen(false); fileRef.current?.click(); }}
            />
          </div>
        </>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleChange} />
      <input ref={fileRef} type="file" multiple className="hidden" onChange={handleChange} />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3 text-left text-sm font-medium flex items-center gap-3 transition hover:bg-white/10"
      style={{ color: "#f5f5f5" }}
    >
      <span style={{ color: "#f5c842" }}>{icon}</span>
      {label}
    </button>
  );
}
