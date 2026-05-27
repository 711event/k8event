"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@k8event/shared/supabase/client";

type Ctx = { pendingCount: number };
const RedemptionPendingContext = createContext<Ctx>({ pendingCount: 0 });

export const useRedemptionPending = () => useContext(RedemptionPendingContext);

const POLL_INTERVAL_MS = 10000;

export function RedemptionPendingProvider({
  children,
  groupId,
}: {
  children: React.ReactNode;
  groupId?: string;
}) {
  const [pendingCount, setPendingCount] = useState(0);
  const pathname = usePathname();
  const audioPrimedRef = useRef(false);
  const lastCountRef = useRef(0);

  // Reset seen count when on the redemptions page
  useEffect(() => {
    if (pathname?.startsWith("/admin/redemptions")) {
      lastCountRef.current = pendingCount;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Prime AudioContext on first user gesture
  useEffect(() => {
    function prime() { audioPrimedRef.current = true; }
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  // Polling loop
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createSupabaseBrowserClient() as any;

    async function pollOnce() {
      if (cancelled) return;
      try {
        let playerIds: string[] = [];

        // Get player IDs for this group (redemption_requests has no group_id, filter via profiles)
        if (groupId) {
          const { data: players } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("group_id", groupId)
            .eq("role", "player");
          playerIds = (players ?? []).map((p: { user_id: string }) => p.user_id);
          if (playerIds.length === 0) {
            scheduleNext();
            return;
          }
        }

        let q = supabase
          .from("redemption_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");
        if (groupId && playerIds.length > 0) q = q.in("player_id", playerIds);

        const { count, error } = await q;
        if (cancelled) return;
        if (!error) {
          const next = count ?? 0;
          if (next > lastCountRef.current) {
            playDingDong(audioPrimedRef.current);
          }
          lastCountRef.current = next;
          setPendingCount(next);
        }
      } catch { /* network blip */ }
      scheduleNext();
    }

    function scheduleNext() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      timer = setTimeout(pollOnce, POLL_INTERVAL_MS);
    }

    function onVisibility() {
      if (cancelled) return;
      if (document.hidden) {
        if (timer) { clearTimeout(timer); timer = null; }
      } else {
        if (timer) clearTimeout(timer);
        void pollOnce();
      }
    }

    void pollOnce();
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  return (
    <RedemptionPendingContext.Provider value={{ pendingCount }}>
      {children}
    </RedemptionPendingContext.Provider>
  );
}

/** 叮咚 — same double-chime as referral notifications */
function playDingDong(primed: boolean) {
  if (!primed) return;
  try {
    const AudioCtor: typeof AudioContext =
      window.AudioContext ||
      // @ts-expect-error legacy WebKit
      window.webkitAudioContext;
    const ctx = new AudioCtor();
    const now = ctx.currentTime;

    const chime = (freq: number, start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.35, now + start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.6);
      osc.start(now + start);
      osc.stop(now + start + 0.65);
    };

    chime(659, 0);      // 叮 — E5
    chime(523, 0.22);   // 咚 — C5

    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch { /* browser blocked */ }
}
