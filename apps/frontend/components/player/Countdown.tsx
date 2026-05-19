"use client";

import { useEffect, useState } from "react";

function diff(target: number) {
  const now = Date.now();
  let ms = Math.max(0, target - now);
  const d = Math.floor(ms / 86_400_000); ms -= d * 86_400_000;
  const h = Math.floor(ms / 3_600_000);  ms -= h * 3_600_000;
  const m = Math.floor(ms / 60_000);     ms -= m * 60_000;
  const s = Math.floor(ms / 1000);
  return { d, h, m, s, done: target - now <= 0 };
}

const pad = (n: number) => n.toString().padStart(2, "0");

export function Countdown({
  to,
  className,
  compact,
}: {
  to: string | number | Date;
  className?: string;
  compact?: boolean;
}) {
  const target = new Date(to).getTime();
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    setT(diff(target));
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (t.done) {
    return <span className={className}>已开赛</span>;
  }

  if (compact) {
    if (t.d > 0) {
      return <span className={className}>{t.d}天 {pad(t.h)}:{pad(t.m)}:{pad(t.s)}</span>;
    }
    return <span className={className}>{pad(t.h)}:{pad(t.m)}:{pad(t.s)}</span>;
  }

  return (
    <span className={className}>
      {t.d > 0 && (
        <>
          <Unit n={t.d} label="天" />
          <Sep />
        </>
      )}
      <Unit n={t.h} label="时" />
      <Sep />
      <Unit n={t.m} label="分" />
      <Sep />
      <Unit n={t.s} label="秒" />
    </span>
  );
}

function Unit({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex flex-col items-center mx-0.5">
      <span className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums leading-none">
        {pad(n)}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-[var(--text-lo)] mt-0.5">{label}</span>
    </span>
  );
}

function Sep() {
  return <span className="text-[var(--text-lo)] mx-0.5">:</span>;
}
