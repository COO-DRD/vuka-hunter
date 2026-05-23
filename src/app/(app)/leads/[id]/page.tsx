import { requireUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAGES, scoreColor, scoreBg } from "@/lib/utils";
import { Star, Globe, Phone, Mail, MapPin, ExternalLink, Zap, CheckCircle, Clock, AlertCircle } from "lucide-react";
import LeadActions from "@/components/leads/LeadActions";
import StageSelector from "@/components/leads/StageSelector";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const db = createSupabaseServiceClient();
  const { data: lead } = await db.from("hunter_leads").select("*").eq("id", id).eq("org_id", user.id).single();
  if (!lead) notFound();

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{lead.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-zinc-400">
            <span>{lead.vertical}</span>
            {lead.city && <><span>·</span><span>{lead.city}</span></>}
            {lead.google_rating && (
              <><span>·</span>
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                {lead.google_rating} ({lead.google_review_count} reviews)
              </span></>
            )}
          </div>
        </div>
        <StageSelector leadId={lead.id} currentStage={lead.stage} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lead.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-zinc-500 shrink-0" /><a href={`tel:${lead.phone}`} className="text-sm text-zinc-300 hover:text-zinc-100">{lead.phone}</a></div>}
              {(lead.emails_found?.length > 0 || lead.email) && (
                <div className="flex items-start gap-2"><Mail className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
                  <div>
                    {lead.email && <p className="text-sm text-zinc-300">{lead.email}</p>}
                    {lead.emails_found?.filter((e: string) => e !== lead.email).map((e: string) => <p key={e} className="text-xs text-zinc-500">{e}</p>)}
                  </div>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-zinc-500 shrink-0" />
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-300 hover:text-zinc-100 truncate flex items-center gap-1">
                    {new URL(lead.website).hostname}<ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                </div>
              )}
              {lead.address && <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" /><span className="text-sm text-zinc-300">{lead.address}</span></div>}
              {lead.google_maps_url && <a href={lead.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">View on Google Maps <ExternalLink className="h-3 w-3" /></a>}
            </div>
          </CardContent>
        </Card>

        <Card className={`lg:col-span-1 border ${lead.score ? scoreBg(lead.score) : "border-zinc-800"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>AI Score</CardTitle>
              {lead.score && <span className={`text-2xl font-black ${scoreColor(lead.score)}`}>{lead.score}</span>}
            </div>
          </CardHeader>
          <CardContent>
            {lead.score ? (
              <>
                {lead.score_reasoning && <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{lead.score_reasoning}</p>}
                {lead.pain_signals?.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-2 font-medium">Pain signals</p>
                    <div className="flex flex-wrap gap-1">
                      {lead.pain_signals.map((s: string) => <Badge key={s} variant="red" className="text-xs">{s}</Badge>)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4"><Zap className="h-6 w-6 text-zinc-600 mx-auto mb-2" /><p className="text-xs text-zinc-500">Not scored yet</p></div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Enrichment</CardTitle>
              {lead.enrichment_status === "done" ? <CheckCircle className="h-4 w-4 text-green-400" /> : lead.enrichment_status === "failed" ? <AlertCircle className="h-4 w-4 text-red-400" /> : <Clock className="h-4 w-4 text-zinc-500" />}
            </div>
          </CardHeader>
          <CardContent>
            {lead.enrichment_status === "done" ? (
              <div className="space-y-2">
                {lead.has_booking_system !== null && <div className="flex items-center justify-between text-xs"><span className="text-zinc-500">Booking system</span><Badge variant={lead.has_booking_system ? "green" : "red"}>{lead.has_booking_system ? "Yes" : "No"}</Badge></div>}
                {lead.has_live_chat !== null && <div className="flex items-center justify-between text-xs"><span className="text-zinc-500">Live chat</span><Badge variant={lead.has_live_chat ? "green" : "red"}>{lead.has_live_chat ? "Yes" : "No"}</Badge></div>}
                {lead.tech_stack?.length > 0 && <div><p className="text-xs text-zinc-500 mb-1">Tech stack</p><div className="flex flex-wrap gap-1">{lead.tech_stack.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div></div>}
              </div>
            ) : <p className="text-xs text-zinc-500">Not enriched yet</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Actions &amp; Notes</CardTitle></CardHeader>
          <CardContent><LeadActions lead={lead} /></CardContent>
        </Card>
      </div>
    </div>
  );
}
