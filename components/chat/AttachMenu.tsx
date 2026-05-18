"use client";

import { useRef, useState } from "react";

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
        className="h-10 w-10 rounded-full border border-foreground/15 flex items-center justify-center text-lg disabled:opacity-60"
        aria-label="Attach"
      >
        +
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-12 left-0 z-20 w-48 rounded-lg border border-foreground/10 bg-background shadow-lg overflow-hidden">
            <MenuItem
              label="📷  Camera"
              onClick={() => cameraRef.current?.click()}
            />
            <MenuItem
              label="🖼️  Gallery (multi)"
              onClick={() => galleryRef.current?.click()}
            />
            <MenuItem label="📎  File" onClick={() => fileRef.current?.click()} />
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

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3 text-left text-sm hover:bg-foreground/[0.06] flex items-center gap-2"
    >
      {label}
    </button>
  );
}
