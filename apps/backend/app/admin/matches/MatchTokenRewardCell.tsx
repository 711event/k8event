"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { updateMatchTokenRewardAction } from "./actions";

interface Props {
  matchId: string;
  tokenReward: number;
  status: string;
}

export function MatchTokenRewardCell({ matchId, tokenReward, status }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(tokenReward);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setValue(tokenReward);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function cancel() {
    setEditing(false);
    setValue(tokenReward);
  }

  function save() {
    if (value === tokenReward) { setEditing(false); return; }
    startTransition(async () => {
      const r = await updateMatchTokenRewardAction(matchId, value);
      if (r && "error" in r) {
        toast.error(r.error);
      } else {
        toast.success(`Reward updated to ${value}`);
        setEditing(false);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          min={1}
          max={9999}
          value={value}
          onChange={(e) => setValue(Math.max(1, Math.min(9999, Number(e.target.value))))}
          onKeyDown={handleKeyDown}
          className="w-16 h-7 px-2 rounded border border-zinc-300 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-400"
          disabled={pending}
          autoFocus
        />
        <button
          onClick={save}
          disabled={pending}
          className="text-xs px-1.5 py-0.5 rounded bg-zinc-900 text-white disabled:opacity-50"
        >
          {pending ? "…" : "✓"}
        </button>
        <button
          onClick={cancel}
          disabled={pending}
          className="text-xs px-1.5 py-0.5 rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
        >
          ✕
        </button>
      </div>
    );
  }

  const isEditable = status === "scheduled";

  return (
    <span
      className={`tabular-nums ${isEditable ? "cursor-pointer hover:text-amber-600 group inline-flex items-center gap-1" : ""}`}
      onClick={isEditable ? startEdit : undefined}
      title={isEditable ? "Click to edit reward" : undefined}
    >
      {tokenReward}
      {isEditable && (
        <span className="opacity-0 group-hover:opacity-100 text-xs text-zinc-400">✎</span>
      )}
    </span>
  );
}
