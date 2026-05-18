"use client";

import imageCompression from "browser-image-compression";
import { getChatDb, type LocalImage } from "./dexie";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const uuid = () => crypto.randomUUID();

export type SenderContext =
  | { sender: "guest"; guestToken: string }
  | { sender: "agent"; userId: string };

async function readDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image_load_failed"));
      img.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function ingestFiles(files: File[], ctx: SenderContext): Promise<string[]> {
  const ids: string[] = [];
  const db = getChatDb();
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const id = uuid();
    try {
      const [full, thumb] = await Promise.all([
        imageCompression(file, {
          maxWidthOrHeight: 1600,
          maxSizeMB: 1.2,
          useWebWorker: true,
          fileType: "image/webp",
        }),
        imageCompression(file, {
          maxWidthOrHeight: 200,
          maxSizeMB: 0.05,
          useWebWorker: true,
          fileType: "image/webp",
        }),
      ]);
      const dim = await readDimensions(full);
      await db.images.put({
        id,
        blob: full,
        thumbBlob: thumb,
        width: dim.width,
        height: dim.height,
        createdAt: Date.now(),
      });
      ids.push(id);
      // Fire-and-forget upload in background
      void uploadOne(id, ctx).catch((e) => {
        console.error("[chat] upload failed for", id, e);
      });
    } catch (e) {
      console.error("[chat] ingest failed for", file.name, e);
    }
  }
  return ids;
}

export async function uploadOne(id: string, ctx: SenderContext): Promise<LocalImage | null> {
  const db = getChatDb();
  const row = await db.images.get(id);
  if (!row) return null;
  if (row.storagePath && row.publicUrl) return row;

  const supabase =
    ctx.sender === "guest"
      ? createSupabaseBrowserClient({ "x-guest-token": ctx.guestToken })
      : createSupabaseBrowserClient();

  const prefix = ctx.sender === "guest" ? "guest" : `agent/${ctx.userId}`;
  const path = `${prefix}/${id}.webp`;

  const { error } = await supabase.storage
    .from("chat-images")
    .upload(path, row.blob, { contentType: "image/webp", upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
  await db.images.update(id, {
    storagePath: path,
    publicUrl: data.publicUrl,
    uploadedAt: Date.now(),
  });
  return (await db.images.get(id)) ?? null;
}

export async function ensureUploaded(id: string, ctx: SenderContext): Promise<LocalImage> {
  const existing = await getChatDb().images.get(id);
  if (existing?.publicUrl) return existing;
  const fresh = await uploadOne(id, ctx);
  if (!fresh?.publicUrl) throw new Error("upload_pending");
  return fresh;
}

export async function pruneOldImages(keep = 60) {
  const db = getChatDb();
  const all = await db.images.orderBy("createdAt").reverse().toArray();
  if (all.length <= keep) return;
  const toDelete = all.slice(keep).map((r) => r.id);
  if (toDelete.length) await db.images.bulkDelete(toDelete);
}
