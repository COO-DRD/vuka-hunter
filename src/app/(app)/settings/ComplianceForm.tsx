"use client";

import { useState } from "react";

interface Props {
  kraPin: string;
  companyRegNo: string;
  billingEmail: string;
}

export default function ComplianceForm({ kraPin, companyRegNo, billingEmail }: Props) {
  const [pin,     setPin]     = useState(kraPin);
  const [regNo,   setRegNo]   = useState(companyRegNo);
  const [billing, setBilling] = useState(billingEmail);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/compliance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kraPin: pin, companyRegNo: regNo, billingEmail: billing }),
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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          KRA PIN
        </label>
        <input
          type="text"
          value={pin}
          onChange={(e) => setPin(e.target.value.toUpperCase())}
          placeholder="A000000000Z"
          maxLength={11}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest"
        />
        <p className="mt-1 text-xs text-gray-500">Format: one letter + nine digits + one letter (e.g. A123456789B)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company Registration No.
        </label>
        <input
          type="text"
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
          placeholder="PVT-123456"
          maxLength={100}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">Appears on invoices. As filed with the Registrar of Companies.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Billing Email
        </label>
        <input
          type="email"
          value={billing}
          onChange={(e) => setBilling(e.target.value.toLowerCase())}
          placeholder="billing@yourcompany.co.ke"
          maxLength={200}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">Invoices and payment receipts are sent here.</p>
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : "Save compliance details"}
      </button>
    </div>
  );
}
