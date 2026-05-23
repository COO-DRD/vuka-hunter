import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import LeadDetail from "@/components/leads/LeadDetail";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const db = createSupabaseServiceClient();
  const { data: lead } = await db
    .from("hunter_leads")
    .select("*")
    .eq("id", id)
    .eq("org_id", user.id)
    .single();
  if (!lead) notFound();

  return <LeadDetail lead={lead} />;
}
