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
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* bottom offset must clear the QuickReply chip row + (optional) ThumbStrip sitting above the input row. */}
          <div className="absolute bottom-[7rem] left-0 z-20 w-44 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-[var(--shadow-card)] overflow-hidden">
            <MenuItem
              icon={<Camera size={16} />}
              label="拍照"
              onClick={() => cameraRef.current?.click()}
            />
            <MenuItem
              icon={<ImageIcon size={16} />}
              label="相册(多选)"
              onClick={() => galleryRef.current?.click()}
            />
            <MenuItem
              icon={<Paperclip size={16} />}
              label="文件"
              onClick={() => fileRef.current?.click()}
            />
          </div>
        </>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <input ref={fileRef} type="file" className="hidden" onChange={handleChange} />
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
      className="w-full px-4 py-3 text-left text-sm text-[var(--text-hi)] hover:bg-[var(--bg-raised)] flex items-center gap-2.5 transition"
    >
      <span className="text-[var(--gold-300)]">{icon}</span>
      {label}
    </button>
  );
}
