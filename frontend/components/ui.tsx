import Link from "next/link";

import { RESULT_LABEL } from "@/lib/genlayer/format";

const TONE: Record<string, string> = {
  VERIFIED: "ok", PARTIALLY_VERIFIED: "info", NOT_VERIFIED: "bad", INCONCLUSIVE: "warn", HANDOVER_DEVIATION: "bad",
  FINALIZED: "ok", CANCELLED: "bad", ACCEPTED: "info", VERDICT_PROPOSED: "warn",
};

export function Chip({ value, label }: { value: string; label?: string }) {
  return <span className={`chip ${TONE[value] ?? ""}`}>{label ?? RESULT_LABEL[value] ?? value.replaceAll("_", " ").toLowerCase()}</span>;
}

export function Marquee({ items }: { items: string[] }) {
  const doubled = [...items, ...items];
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee-track">
        {doubled.map((t, i) => <span key={i} className="marquee-item display" style={{ fontSize: 30 }}>{t} <span style={{ color: "var(--lime)" }}> &bull; </span></span>)}
      </div>
    </div>
  );
}

export function SectionHead({ n, title, accent, id }: { n: string; title: string; accent: string; id?: string }) {
  return (
    <div id={id} style={{ marginBottom: 40 }}>
      <div className="label" style={{ marginBottom: 14 }}>{n}</div>
      <h2 className="display" style={{ fontSize: "clamp(40px, 7vw, 92px)", margin: 0 }}>
        {title} <span className="accent">{accent}</span>
      </h2>
    </div>
  );
}

export function Notice({ tone = "warn", children }: { tone?: "warn" | "bad" | "info"; children: React.ReactNode }) {
  const color = tone === "bad" ? "var(--bad)" : tone === "info" ? "var(--info)" : "var(--warn)";
  return <div className="card card-pad" style={{ borderColor: color, color, fontSize: 14, lineHeight: 1.6 }}>{children}</div>;
}

export function HandoverRow({ p }: { p: { id: string; title: string; subject: string; state: string; result: string; contractor: string; deadline: number } }) {
  return (
    <Link href={`/handovers/${p.id}`} className="row" style={{ gridTemplateColumns: "56px 1fr auto" }}>
      <span className="num">{p.id}</span>
      <span>
        <span className="row-title" style={{ fontSize: 17, fontWeight: 600 }}>{p.title}</span>
        <span style={{ display: "block", color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{p.subject}</span>
      </span>
      <span style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {p.result ? <Chip value={p.result} /> : null}
        <Chip value={p.state} />
      </span>
    </Link>
  );
}
