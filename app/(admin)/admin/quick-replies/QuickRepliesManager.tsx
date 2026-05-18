"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import {
  createQuickReplyAction,
  deleteQuickReplyAction,
  type QRState,
} from "./actions";

type QR = { id: string; title: string; body: string };

export function QuickRepliesManager({ replies }: { replies: QR[] }) {
  const [state, formAction, pending] = useActionState<QRState, FormData>(
    createQuickReplyAction,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state && state.ok) {
      toast.success("Quick reply added");
      formRef.current?.reset();
    } else if (state && "error" in state) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <>
      <section className="rounded-lg border border-foreground/10 p-5 space-y-3">
        <h2 className="text-lg font-medium">Add</h2>
        <form ref={formRef} action={formAction} className="space-y-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Title</span>
            <input
              name="title"
              required
              placeholder="++WELCOME"
              pattern="\+\+[A-Z0-9_]+"
              className="h-10 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Body</span>
            <textarea
              name="body"
              required
              rows={3}
              placeholder="Hello! How can we help you today?"
              className="px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="h-10 px-4 rounded-md bg-foreground text-background font-medium text-sm disabled:opacity-60"
          >
            {pending ? "Saving…" : "Add"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-foreground/10 divide-y divide-foreground/10">
        {replies.length === 0 ? (
          <div className="px-4 py-6 text-zinc-500">No quick replies yet.</div>
        ) : (
          replies.map((r) => <QRRow key={r.id} qr={r} />)
        )}
      </section>
    </>
  );
}

function QRRow({ qr }: { qr: QR }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="px-4 py-3 flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm">{qr.title}</div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5 whitespace-pre-wrap break-words">
          {qr.body}
        </div>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete "${qr.title}"?`)) return;
          startTransition(async () => {
            const r = await deleteQuickReplyAction(qr.id);
            if (r && "error" in r) toast.error(r.error);
            else toast.success("Deleted");
          });
        }}
        className="text-sm text-red-600 hover:underline disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
