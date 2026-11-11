"use client";
import Link from "next/link";

import { Notice, HandoverRow, SectionHead } from "@/components/ui";
import { configured } from "@/lib/config";
import { reads } from "@/lib/genlayer/contract";
import { useLoad } from "@/lib/hooks";

export default function Handovers() {
  const { data, error, loading } = useLoad(() => (configured ? reads.handovers(0, 30) : Promise.resolve(null)), []);
  return (
    <div className="wrap" style={{ paddingTop: 72 }}>
      <SectionHead n="all handovers" title="the work," accent="in progress." />
      <div style={{ marginBottom: 28 }}><Link href="/handovers/new" className="btn">Start a handover</Link></div>
      {!configured && <Notice>No contract is configured yet. See DEPLOYMENT.md.</Notice>}
      {error && <Notice tone="bad">{error}</Notice>}
      {loading && <div className="label">Reading the chain...</div>}
      {data && data.items.length === 0 && <div className="label">No handovers yet. Create the first one.</div>}
      {data?.items.map((p) => <HandoverRow key={p.id} p={p} />)}
    </div>
  );
}
