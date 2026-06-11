"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  kraPin: string;
  companyRegNo: string;
  billingEmail: string;
}

const KRA_RE = /^[A-Z]\d{9}[A-Z]$/;

function validate(pin: string, regNo: string, billing: string): string | null {
  if (pin && !KRA_RE.test(pin))
    return "KRA PIN must be one letter + nine digits + one letter (e.g. A123456789B).";
  if (billing && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(billing))
    return "Enter a valid billing email address.";
  if (regNo && regNo.trim().length < 3)
    return "Company registration number must be at least 3 characters.";
  return null;
}

export default function ComplianceForm({ kraPin, companyRegNo, billingEmail }: Props) {
  const [pin,     setPin]     = useState(kraPin);
  const [regNo,   setRegNo]   = useState(companyRegNo);
  const [billing, setBilling] = useState(billingEmail);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setMsg(null);
    const err = validate(pin.trim(), regNo.trim(), billing.trim());
    if (err) { setMsg({ ok: false, text: err }); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/compliance", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ kraPin: pin.trim(), companyRegNo: regNo.trim(), billingEmail: billing.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) setMsg({ ok: false, text: data.error ?? "Update failed." });
      else         setMsg({ ok: true,  text: "Compliance details saved." });
    } catch {
      setMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-3">
        <label className="form-label text-muted small">KRA PIN</label>
        <Input
          type="text"
          value={pin}
          onChange={(e) => { setPin(e.target.value.toUpperCase()); setMsg(null); }}
          placeholder="A123456789B"
          maxLength={11}
          className="font-monospace"
        />
        <div className="form-text">Format: one letter + nine digits + one letter (e.g. A123456789B)</div>
      </div>

      <div className="mb-3">
        <label className="form-label text-muted small">Company Registration No.</label>
        <Input
          type="text"
          value={regNo}
          onChange={(e) => { setRegNo(e.target.value); setMsg(null); }}
          placeholder="PVT-123456"
          maxLength={100}
        />
        <div className="form-text">Appears on invoices. As filed with the Registrar of Companies.</div>
      </div>

      <div className="mb-3">
        <label className="form-label text-muted small">Billing Email</label>
        <Input
          type="email"
          value={billing}
          onChange={(e) => { setBilling(e.target.value.toLowerCase()); setMsg(null); }}
          placeholder="billing@yourcompany.co.ke"
          maxLength={200}
        />
        <div className="form-text">Invoices and payment receipts are sent here.</div>
      </div>

      {msg && (
        <p className={`small mb-3 ${msg.ok ? "text-warning" : "text-danger"}`}>{msg.text}</p>
      )}

      <Button onClick={save} loading={saving} variant="outline" size="sm">
        Save compliance details
      </Button>
    </div>
  );
}
