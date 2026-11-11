"use client";
import Link from "next/link";
import { use } from "react";

import { Chip, Notice, SectionHead } from "@/components/ui";
import { addressLink, configured } from "@/lib/config";
import { reads } from "@/lib/genlayer/contract";
import { formatTime, RESULT_LABEL } from "@/lib/genlayer/format";
import { useLoad } from "@/lib/hooks";

export default function Party({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const { data, error, loading } = useLoad(() => (configured ? reads.party(address) : Promise.resolve(null)), [address]);
  const keys = ["VERIFIED", "PARTIALLY_VERIFIED", "NOT_VERIFIED", "INCONCLUSIVE", "HANDOVER_DEVIATION"];

  return (
    <div className="wrap" style={{ paddingTop: 72 }}>
      <SectionHead n="contractor record" title="track record," accent="verified." />
      <a className="mono" style={{ color: "var(--muted)", wordBreak: "break-all" }} href={addressLink(address)} target="_blank" rel="noreferrer">{address}</a>
      {error && <div style={{ marginTop: 24 }}><Notice tone="bad">{error}</Notice></div>}
      {loading && <div className="label" style={{ marginTop: 24 }}>Reading the chain...</div>}
      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 1, background: "var(--line)", border: "1px solid var(--line)", margin: "32px 0" }}>
            <div style={{ background: "var(--bg)", padding: 24 }}>
              <div className="label">Finalized</div><div className="display" style={{ fontSize: 40, marginTop: 8 }}>{data.total}</div>
            </div>
            <div style={{ background: "var(--bg)", padding: 24 }}>
              <div className="label">Fully verified</div><div className="display" style={{ fontSize: 40, marginTop: 8 }}>{(data.verified_bps / 100).toFixed(data.verified_bps % 100 ? 1 : 0)}%</div>
            </div>
            {keys.map((k) => (
              <div key={k} style={{ background: "var(--bg)", padding: 24 }}>
                <div className="label">{RESULT_LABEL[k]}</div><div className="display" style={{ fontSize: 40, marginTop: 8 }}>{data.counts[k] ?? 0}</div>
              </div>
            ))}
          </div>
          {data.entries.length === 0 && <div className="label">This party has no finalized handovers yet.</div>}
          {[...data.entries].reverse().map((e) => (
            <Link key={e.handover_id} href={`/handovers/${e.handover_id}`} className="row" style={{ gridTemplateColumns: "56px 1fr auto auto" }}>
              <span className="num">{e.handover_id}</span>
              <span className="row-title" style={{ fontWeight: 600 }}>{e.title}</span>
              <Chip value={e.result} />
              <span className="num">{formatTime(e.finalized_at)}</span>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}
