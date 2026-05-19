"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { requireRole } from "@k8event/shared/auth/require-role";

const teamSchema = z.object({
  name: z.string().min(1, "Name required").max(80),
  shortCode: z.string().trim().max(8).optional().or(z.literal("")).transform((v) => v || null),
  logoUrl: z.string().url().optional().or(z.literal("")).transform((v) => v || null),
});

export type TeamFormState = { ok: true } | { error: string } | undefined;

export async function createTeamAction(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  await requireRole("admin");
  const parsed = teamSchema.safeParse({
    name: formData.get("name"),
    shortCode: formData.get("shortCode") || "",
    logoUrl: formData.get("logoUrl") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("teams").insert({
    name: parsed.data.name,
    short_code: parsed.data.shortCode,
    logo_url: parsed.data.logoUrl,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/teams");
  revalidatePath("/admin/matches");
  return { ok: true };
}

export async function deleteTeamAction(id: string): Promise<TeamFormState> {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/teams");
  return { ok: true };
}
