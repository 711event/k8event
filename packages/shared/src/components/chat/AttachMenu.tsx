"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";

export function AttachMenu({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void | Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length) void onFiles(files);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="h-10 w-10 rounded-full border border-[var(--border-strong)] bg-[var(--bg-raised)] flex items-center justify-center text-[var(--text-mid)] hover:border-[var(--gold-500)]/60 hover:text-[var(--gold-300)] disabled:opacity-60 transition"
        aria-label="附件"
      >
        <Plus size={18} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
