"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Chip, Notice, HandoverRow, SectionHead } from "@/components/ui";
import { configured } from "@/lib/config";
import { reads } from "@/lib/genlayer/contract";
import { RESULT_LABEL } from "@/lib/genlayer/format";
import { useLoad } from "@/lib/hooks";

const FILTERS = ["", "VERIFIED", "PARTIALLY_VERIFIED", "NOT_VERIFIED", "INCONCLUSIVE", "HANDOVER_DEVIATION"];

export default function Registry() {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [party, setParty] = useState("");
  const { data, error, loading } = useLoad(() => (configured ? reads.registry(filter, 0, 30) : Promise.resolve(null)), [filter]);
  const valid = /^0x[0-9a-fA-F]{40}$/.test(party.trim());

  return (
    <div className="wrap" style={{ paddingTop: 72 }}>
      <SectionHead n="contractor record" title="every handover," accent="on the record." />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        <input className="field mono" style={{ flex: "1 1 360px" }} placeholder="Look up a contractor: 0x..." value={party} onChange={(e) => setParty(e.target.value)} />
        <button className="btn" disabled={!valid} onClick={() => router.push(`/party/${party.trim()}`)}>Open record</button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {FILTERS.map((f) => (
          <button key={f || "all"} className="btn ghost sm" style={f === filter ? { borderColor: "var(--text)" } : undefined} onClick={() => setFilter(f)}>
            {f ? RESULT_LABEL[f] : "All"}
          </button>
        ))}
      </div>
      {!configured && <Notice>No contract is configured yet. See DEPLOYMENT.md.</Notice>}
      {error && <Notice tone="bad">{error}</Notice>}
      {loading && <div className="label">Reading the chain...</div>}
      {data && data.items.length === 0 && <div className="label">Nothing finalized yet{filter ? ` as ${RESULT_LABEL[filter]}` : ""}.</div>}
      {data?.items.map((p) => (
        <div key={p.id}>
          <HandoverRow p={p} />
          <div style={{ margin: "-6px 0 14px 72px" }}><Chip value="" label={`party ${p.contractor.slice(0, 8)}...`} /></div>
        </div>
      ))}
    </div>
  );
}
