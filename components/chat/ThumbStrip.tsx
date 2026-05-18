"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getChatDb, type LocalImage } from "@/lib/chat/dexie";

export function ThumbStrip({
  onPick,
}: {
  onPick: (image: LocalImage) => void | Promise<void>;
}) {
  // Defer DB access to client (after mount) to avoid Dexie touching IndexedDB during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const images = useLiveQuery(
    async () => {
      if (!mounted) return [] as LocalImage[];
      return getChatDb().images.orderBy("createdAt").reverse().limit(30).toArray();
    },
    [mounted],
    [] as LocalImage[],
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!images || images.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-foreground/10 flex gap-2 overflow-x-auto">
      {images.map((img) => (
        <ThumbButton
          key={img.id}
          image={img}
          busy={busyId === img.id}
          onPick={async () => {
            setBusyId(img.id);
            try {
              await onPick(img);
            } finally {
              setBusyId(null);
            }
          }}
        />
      ))}
    </div>
  );
}

function ThumbButton({
  image,
  busy,
  onPick,
}: {
  image: LocalImage;
  busy: boolean;
  onPick: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(image.thumbBlob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image.thumbBlob]);

  const uploading = !image.uploadedAt;

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={busy}
      className="relative h-14 w-14 flex-shrink-0 rounded-md overflow-hidden border border-foreground/10 hover:border-foreground/40 disabled:opacity-60"
      title={uploading ? "Uploading…" : "Send this image"}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-foreground/[0.06]" />
      )}
      {(uploading || busy) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px]">
          {busy ? "Sending" : "Up…"}
        </div>
      )}
    </button>
  );
}
