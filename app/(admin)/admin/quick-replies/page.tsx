import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QuickRepliesManager } from "./QuickRepliesManager";

export const metadata = { title: "Quick replies · k8event admin" };

export default async function QuickRepliesPage() {
  await requireRole(["admin", "agent"]);
  const supabase = await createSupabaseServerClient();
  const { data: replies } = await supabase
    .from("quick_replies")
    .select("id, title, body")
    .order("sort_order")
    .order("title");

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Quick replies</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Title must look like <code>++WELCOME</code> (starts with <code>++</code>, uppercase, digits or underscore).
          Agents tap the title chip in chat to fill the composer with the body.
        </p>
      </div>
      <QuickRepliesManager replies={replies ?? []} />
    </main>
  );
}
