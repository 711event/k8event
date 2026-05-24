"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireRole } from "@k8event/shared/auth/require-role";
import { getGroupId } from "@/lib/get-group";

export async function updateBrandingAction(formData: FormData) {
  await requireRole("admin");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const companyName = formData.get("company_name") as string | null;
  const file = formData.get("logo_file") as File | null;
  const groupId = getGroupId();

  let logoUrl: string | undefined;

  if (file && file.size > 0) {
    // Ensure brand bucket exists (public)
    await supabase.storage.createBucket("brand", { public: true }).catch(() => {
      // bucket already exists — ignore
    });

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${groupId}/logo.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("brand")
      .upload(path, arrayBuffer, {
        contentType: file.type || "image/png",
        upsert: true,
      });

    if (uploadError) throw new Error("上传失败: " + uploadError.message);

    const { data: urlData } = supabase.storage.from("brand").getPublicUrl(path);
    // Append cache-buster so browsers pick up the new image
    logoUrl = urlData.publicUrl + "?t=" + Date.now();
  }

  const updateData: Record<string, unknown> = {};
  if (companyName?.trim()) updateData.company_name = companyName.trim();
  if (logoUrl) updateData.logo_url = logoUrl;

  if (Object.keys(updateData).length > 0) {
    await supabase.from("groups").update(updateData).eq("id", groupId);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin", "layout");
}

export async function removeLogo() {
  await requireRole("admin");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await supabase.from("groups").update({ logo_url: null }).eq("id", getGroupId());
  revalidatePath("/admin/settings");
  revalidatePath("/admin", "layout");
}
