import Dexie, { type Table } from "dexie";

export interface LocalImage {
  id: string;
  blob: Blob; // compressed full (~1.2MB max, 1600px max)
  thumbBlob: Blob; // tiny preview (~50KB, 200px max)
  width: number;
  height: number;
  storagePath?: string;
  publicUrl?: string;
  uploadedAt?: number; // ms
  createdAt: number; // ms
}

class ChatDB extends Dexie {
  images!: Table<LocalImage, string>;
  constructor() {
    super("k8e-chat");
    this.version(1).stores({ images: "id, createdAt, uploadedAt" });
  }
}

let _db: ChatDB | null = null;

// Safe on both server and client.
// Dexie construction itself does not touch IndexedDB; only reads/writes do.
// In RSC/SSR no read/write happens (useLiveQuery's callback only runs client-side),
// so returning a constructed instance is fine.
export function getChatDb(): ChatDB {
  if (!_db) _db = new ChatDB();
  return _db;
}
