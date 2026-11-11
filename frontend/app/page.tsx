"use client";
import Link from "next/link";

import { Marquee, Notice, SectionHead } from "@/components/ui";
import { configured } from "@/lib/config";
import { reads } from "@/lib/genlayer/contract";
import { formatGen, formatTime } from "@/lib/genlayer/format";
import { useLoad } from "@/lib/hooks";

const WORDS = ["the", "work", "isn't", "done", "until", "it's", "proven."];

const STEPS = [
  ["write it down", "The client and the contractor agree a checklist for the end of the job: repository transferred, docs published, access removed. The final payment is locked against it and the terms are frozen."],
  ["hand over the proof", "Either side, and the helpers they authorize, register public web pages as evidence. Nobody else can write to the evidence set, and four of the twelve slots are always reserved for the two parties."],
  ["let validators check", "Every validator fetches every page itself and rules on each checklist item. The contract works out the result, pays the contractor by basis points and writes the outcome to the contractor's public record."],
];

export default function Home() {
  const info = useLoad(() => (configured ? reads.info() : Promise.resolve(null)), []);
  const activity = useLoad(() => (configured ? reads.activity(0, 6) : Promise.resolve(null)), []);

  return (
    <>
      <section className="hero-lime" style={{ overflow: "hidden" }}>
        <div className="wrap" style={{ padding: "56px 24px 40px", display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,.7fr)", gap: 32, alignItems: "end" }} id="hero">
          <div>
            <h1 className="display" style={{ fontSize: "clamp(56px, 11.5vw, 168px)", margin: 0 }}>
              {WORDS.map((w) => <span key={w} style={{ display: "block" }}>{w}</span>)}
            </h1>
          </div>
          <div style={{ paddingBottom: 12 }}>
            <p style={{ fontSize: 19, lineHeight: 1.5, fontWeight: 500, margin: "0 0 28px", maxWidth: 380 }}>
              Handover turns the end of a contract into a public record. Agree the checklist, put the evidence on chain, and let
              independent GenLayer validators decide whether the work is really handed over.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/handovers/new" className="btn" style={{ background: "var(--ink)", color: "var(--lime)", borderColor: "var(--ink)" }}>start a handover</Link>
              <Link href="/registry" className="btn ghost" style={{ color: "var(--ink)", borderColor: "var(--ink)" }}>contractor record</Link>
            </div>
          </div>
        </div>
        <style>{`@media (max-width: 860px){ #hero{ grid-template-columns: 1fr !important } }`}</style>
      </section>

      {/* the same line, repeated and fading, in the manner of a manifesto wall */}
      <section aria-hidden style={{ overflow: "hidden", padding: "40px 0", borderBottom: "1px solid var(--line)" }}>
        <div className="stack wrap" style={{ gap: 56 }}>
          {[1, 0.5, 0.25, 0.12].map((o) => (
            <div key={o} className="stack-col display" style={{ fontSize: "clamp(34px, 6vw, 76px)", opacity: o, color: o === 1 ? "var(--lime)" : "var(--text)" }}>
              {WORDS.map((w) => <span key={w}>{w}</span>)}
            </div>
          ))}
        </div>
      </section>

      <Marquee items={["agree the checklist", "lock the payment", "hand over the proof", "validators verify", "contractor record", "paid on the result"]} />

      <section className="wrap" style={{ paddingTop: 96 }}>
        {!configured && (
          <div style={{ marginBottom: 48 }}>
            <Notice>
              No contract is configured yet. Deploy <span className="mono">contracts/handover.py</span> on Studio Next and set{" "}
              <span className="mono">NEXT_PUBLIC_HANDOVER_ADDRESS</span> in Vercel. See DEPLOYMENT.md.
            </Notice>
          </div>
        )}
        <SectionHead n="how it works" title="three moves." accent="one verdict." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {STEPS.map(([name, text], i) => (
            <div key={name} className="card" style={{ padding: 32 }}>
              <div className="num">0{i + 1}</div>
              <h3 className="display" style={{ fontSize: 40, margin: "16px 0 14px" }}>{name}</h3>
              <p style={{ color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 120 }}>
        <SectionHead n="who owns what" title="the model reads." accent="the contract decides." />
        <div className="card" style={{ overflowX: "auto" }}>
          {[
            ["the contract", "Who may add evidence, the four slots reserved for the client and the contractor, custody, the 5-minute pause, the result, every payment, the record."],
            ["genlayer consensus", "Whether each checklist item is met: a question several machines answer apart from each other and must answer alike."],
            ["the model", "One page, one item, one answer, with words it can point at. A quote that is not on the page is thrown away."],
          ].map(([who, owns], i) => (
            <div key={who} className="row" style={{ gridTemplateColumns: "220px 1fr", padding: "24px 32px", borderTop: i ? undefined : 0 }}>
              <span className="display" style={{ fontSize: 26 }}>{who}</span>
              <span style={{ color: "var(--muted)", lineHeight: 1.6 }}>{owns}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 120 }}>
        <SectionHead n="live on chain" title="the record" accent="so far." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            ["handovers", info.data ? String(info.data.handover_count) : "-"],
            ["on the record", info.data ? String(info.data.registry_count) : "-"],
            ["GEN in custody", info.data ? formatGen(info.data.custody) : "-"],
          ].map(([k, v]) => (
            <div key={k} className="card" style={{ padding: 28 }}>
              <div className="label">{k}</div>
              <div className="display" style={{ fontSize: 48, marginTop: 10 }}>{v}</div>
            </div>
          ))}
        </div>
        {activity.data && activity.data.items.length > 0 && (
          <div>
            <div className="label" style={{ marginBottom: 8 }}>recent activity</div>
            {activity.data.items.map((a, i) => (
              <Link key={i} href={`/handovers/${a.handover_id}`} className="row" style={{ gridTemplateColumns: "56px 1fr auto", padding: "12px 0" }}>
                <span className="num">{a.handover_id}</span>
                <span style={{ color: "var(--muted)" }}>{a.note}</span>
                <span className="num">{formatTime(a.at)}</span>
              </Link>
            ))}
          </div>
        )}
        {activity.error && <Notice tone="bad">{activity.error}</Notice>}
      </section>

      <section className="wrap" style={{ paddingTop: 120, textAlign: "center" }}>
        <h2 className="display" style={{ fontSize: "clamp(44px, 9vw, 120px)", margin: "0 0 32px" }}>
          prove the <span className="accent">handover.</span>
        </h2>
        <Link href="/handovers/new" className="btn">start a handover</Link>
      </section>
    </>
  );
}
