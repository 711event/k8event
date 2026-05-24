import { createSupabaseServerClient } from "@k8event/shared/supabase/server";
import { getGroupId } from "./get-group";

export type GroupBranding = {
  company_name: string;
  logo_url: string | null;
};

export async function getGroupBranding(): Promise<GroupBranding> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("groups")
      .select("company_name, logo_url")
      .eq("id", getGroupId())
      .maybeSingle();
    return {
      company_name: data?.company_name ?? "711event",
      logo_url: data?.logo_url ?? null,
    };
  } catch {
    return { company_name: "711event", logo_url: null };
  }
}
