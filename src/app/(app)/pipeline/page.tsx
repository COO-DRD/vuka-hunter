"use client";
import { useState, useEffect } from "react";
import { STAGES } from "@/lib/utils";
import { Star, Globe, Phone } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  vertical: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  google_rating: number;
  google_review_count: number;
  score: number | null;
  stage: string;
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leads?limit=500")
      .then((r) => r.json())
      .then((d) => { setLeads(d.leads ?? []); setLoading(false); });
  }, []);

  async function moveToStage(leadId: string, newStage: string) {
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, stage: newStage } : l));
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    toast.success(`Moved to ${STAGES.find((s) => s.value === newStage)?.label}`);
  }

  function handleDragStart(e: React.DragEvent, leadId: string) {
    e.dataTransfer.setData("leadId", leadId);
    setDragging(leadId);
  }

  function handleDrop(e: React.DragEvent, stage: string) {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId) moveToStage(leadId, stage);
    setDragging(null);
  }

  const byStage = (stage: string) => leads.filter((l) => l.stage === stage);

  return (
    <div className="p-6 h-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-900">Pipeline</h1>
        <p className="text-sm text-stone-500 mt-0.5">Drag and drop leads between stages</p>
      </div>

      {loading ? (
        <div className="text-sm text-stone-400 py-12 text-center">Loading…</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {STAGES.map((stage) => {
            const stageLeads = byStage(stage.value);
            return (
              <div
                key={stage.value}
                className="flex-shrink-0 w-64"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage.value)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${stage.color}`} />
                  <span className="text-sm font-medium text-stone-700">{stage.label}</span>
                  <span className="ml-auto text-xs text-stone-400 bg-stone-100 rounded-full px-2 py-0.5">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-16">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className={`rounded-lg border border-stone-200 bg-white p-3 cursor-grab active:cursor-grabbing hover:border-stone-300 shadow-sm transition-all ${dragging === lead.id ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-stone-800 hover:text-stone-950 line-clamp-2 flex-1">
                          {lead.name}
                        </Link>
                        {lead.score !== null && (
                          <span className={`text-xs font-bold ml-2 shrink-0 ${
                            lead.score >= 70 ? "text-green-600" :
                            lead.score >= 40 ? "text-yellow-600" : "text-stone-400"
                          }`}>{lead.score}</span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 mb-2">{lead.vertical} · {lead.city}</p>
                      <div className="flex items-center gap-2">
                        {lead.google_rating && (
                          <span className="flex items-center gap-0.5 text-xs text-stone-400">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            {lead.google_rating}
                          </span>
                        )}
                        {lead.phone && <Phone className="h-3 w-3 text-stone-300" />}
                        {lead.website && <Globe className="h-3 w-3 text-stone-300" />}
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="rounded-lg border border-dashed border-stone-200 py-8 text-center text-xs text-stone-400">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
