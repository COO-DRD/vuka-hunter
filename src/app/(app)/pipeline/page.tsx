"use client";
import { useState, useEffect } from "react";
import { STAGES } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";
import { IconStar, IconWorld, IconPhone } from "@tabler/icons-react";

interface Lead {
  id: string; name: string; vertical: string; city: string;
  phone: string; email: string; website: string;
  google_rating: number; google_review_count: number;
  score: number | null; stage: string;
}

const STAGE_COLORS: Record<string, string> = {
  new: "secondary", contacted: "info", replied: "warning",
  qualified: "purple", won: "success", lost: "danger",
};

export default function PipelinePage() {
  const [leads, setLeads]     = useState<Lead[]>([]);
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
      method: "PATCH", headers: { "Content-Type": "application/json" },
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
    <div className="container-xl">
      <div className="page-header d-print-none">
        <div className="row g-2 align-items-center">
          <div className="col">
            <h2 className="page-title">Pipeline</h2>
            <div className="text-muted mt-1 small">Drag and drop leads between stages</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted py-5">Loading…</div>
      ) : (
        <div className="d-flex gap-3 overflow-auto pb-4" style={{ minHeight: "60vh" }}>
          {STAGES.map((stage) => {
            const stageLeads = byStage(stage.value);
            const color = STAGE_COLORS[stage.value] ?? "secondary";
            return (
              <div
                key={stage.value}
                style={{ minWidth: 240, flex: "0 0 240px" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, stage.value)}
              >
                {/* Column header */}
                <div className="d-flex align-items-center gap-2 mb-2 px-1">
                  <span className={`badge bg-${color}-lt text-${color}`}>{stage.label}</span>
                  <span className="badge bg-secondary-lt text-secondary ms-auto">{stageLeads.length}</span>
                </div>

                {/* Cards */}
                <div className="d-flex flex-column gap-2" style={{ minHeight: 64 }}>
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className={`card card-sm p-0 ${dragging === lead.id ? "opacity-50" : ""}`}
                      style={{ cursor: "grab" }}
                    >
                      <div className="card-body p-3">
                        <div className="d-flex align-items-start justify-content-between mb-1">
                          <Link href={`/leads/${lead.id}`} className="fw-medium small text-body text-decoration-none lh-sm" style={{ maxWidth: 160 }}>
                            {lead.name}
                          </Link>
                          {lead.score !== null && (
                            <span className={`badge ms-2 flex-shrink-0 ${lead.score >= 70 ? "bg-success-lt text-success" : lead.score >= 40 ? "bg-warning-lt text-warning" : "bg-secondary-lt text-secondary"}`}>
                              {lead.score}
                            </span>
                          )}
                        </div>
                        <div className="text-muted small text-capitalize mb-2">{lead.vertical} · {lead.city}</div>
                        <div className="d-flex align-items-center gap-2">
                          {lead.google_rating ? (
                            <span className="d-flex align-items-center gap-1 text-muted small">
                              <IconStar size={11} className="text-warning" />{lead.google_rating}
                            </span>
                          ) : null}
                          {lead.phone && <IconPhone size={12} className="text-muted" />}
                          {lead.website && <IconWorld size={12} className="text-muted" />}
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="border border-dashed rounded text-center text-muted small py-4">
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
