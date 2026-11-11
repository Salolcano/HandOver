"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";

import { Chip, Notice } from "@/components/ui";
import { TxButton } from "@/components/tx-button";
import { useWallet } from "@/components/wallet-provider";
import { addressLink, configured } from "@/lib/config";
import { calls, reads, type Call, type Handover, type Verification } from "@/lib/genlayer/contract";
import { formatGen, formatTime, parseGen, shortAddress } from "@/lib/genlayer/format";
import { useLoad } from "@/lib/hooks";

const FLOW = ["DRAFT", "AWAITING_ACCEPTANCE", "ACTIVE", "EVIDENCE_SUBMITTED", "VERDICT_PROPOSED", "ACCEPTED", "FINALIZED"];

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => { const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(t); }, []);
  return now;
}

function Actions({ p, reload }: { p: Handover; reload: () => void }) {
  const { address } = useWallet();
  const now = useNow();
  const me = (address ?? "").toLowerCase();
  const isClient = me === p.client;
  const isParty = me === p.contractor;
  const isOwner = isClient || isParty;
  const canSubmit = isOwner || p.submitters.includes(me);
  const [helper, setHelper] = useState("");
  const [amount, setAmount] = useState("");
  const [url, setUrl] = useState("");
  const [supports, setSupports] = useState<string[]>([]);
  const [problem, setProblem] = useState("");

  const wait = Math.max(0, p.proposed_at + p.accept_delay - now);
  const canReopen = p.state === "VERDICT_PROPOSED" && ["INCONCLUSIVE", "HANDOVER_DEVIATION"].includes(p.result);
  const takesEvidence = canSubmit && (["ACTIVE", "EVIDENCE_SUBMITTED"].includes(p.state) || canReopen) && now <= p.deadline;
  const recoverable = !["FINALIZED", "CANCELLED", "ACCEPTED"].includes(p.state) && now > p.deadline + p.recovery_window;

  const fund = (): Call | null => {
    try { const wei = parseGen(amount); if (wei <= 0n) throw new Error("Enter more than 0."); setProblem(""); return calls.fund(p.id, wei); }
    catch (e) { setProblem((e as Error).message); return null; }
  };
  const evidence = (): Call | null => {
    if (!url.trim() || supports.length === 0) { setProblem("Add a https address and tick the requirements it supports."); return null; }
    setProblem(""); return calls.evidence(p.id, url.trim(), supports.join(","));
  };

  return (
    <div className="card card-pad" style={{ display: "grid", gap: 24 }}>
      <div className="label">Actions</div>
      {["DRAFT", "AWAITING_ACCEPTANCE"].includes(p.state) && isClient && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          <input className="field" style={{ width: 140 }} placeholder="GEN to lock" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <TxButton call={fund} onDone={reload} variant="ghost">Fund</TxButton>
          {p.state === "DRAFT" && <TxButton call={calls.freeze(p.id)} onDone={reload}>Freeze handover</TxButton>}
          <TxButton call={calls.cancel(p.id)} onDone={reload} variant="ghost">Cancel</TxButton>
        </div>
      )}
      {p.state === "AWAITING_ACCEPTANCE" && isParty && <TxButton call={calls.accept(p.id)} onDone={reload}>Accept this handover</TxButton>}
      {p.state === "AWAITING_ACCEPTANCE" && !isParty && <div style={{ color: "var(--muted)" }}>Waiting for {shortAddress(p.contractor)} to accept.</div>}
      {p.state === "ACTIVE" && isClient && p.evidence.length === 0 && <TxButton call={calls.cancel(p.id)} onDone={reload} variant="ghost">Cancel</TxButton>}

      {takesEvidence && (
        <div style={{ display: "grid", gap: 12 }}>
          <input className="field mono" placeholder="https://source.example/page" value={url} onChange={(e) => setUrl(e.target.value)} />
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {p.definition.requirements.map((r) => (
              <label key={r.id} className="label" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={supports.includes(r.id)} onChange={(e) => setSupports(e.target.checked ? [...supports, r.id] : supports.filter((s) => s !== r.id))} /> {r.id}
              </label>
            ))}
          </div>
          <div><TxButton call={evidence} onDone={() => { setUrl(""); reload(); }} variant="ghost">Register evidence</TxButton></div>
        </div>
      )}
      {canSubmit && (p.state === "EVIDENCE_SUBMITTED" || canReopen) && p.evidence.length > 0 && (
        <div><TxButton call={calls.verify(p.id)} onDone={reload}>Verify evidence</TxButton>
          <div className="label" style={{ marginTop: 8 }}>Every validator fetches every source. This takes a few minutes.</div></div>
      )}
      {!canSubmit && ["ACTIVE", "EVIDENCE_SUBMITTED"].includes(p.state) && (
        <div style={{ color: "var(--muted)" }}>Only the client, the contractor and authorized submitters can register evidence.</div>
      )}
      {isOwner && !["ACCEPTED", "FINALIZED", "CANCELLED"].includes(p.state) && (
        <div style={{ display: "grid", gap: 10 }}>
          <div className="label">Authorized submitters ({p.submitters.length}/5)</div>
          {p.submitters.map((a) => (
            <div key={a} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span className="mono" style={{ fontSize: 12 }}>{shortAddress(a)}</span>
              <TxButton call={calls.revoke(p.id, a)} onDone={reload} variant="ghost">Revoke</TxButton>
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
            <input className="field mono" style={{ flex: "1 1 280px" }} placeholder="0x... a helper who may add up to 4 sources" value={helper} onChange={(e) => setHelper(e.target.value)} />
            <TxButton call={() => (/^0x[0-9a-fA-F]{40}$/.test(helper.trim()) ? calls.authorize(p.id, helper.trim()) : (setProblem("Enter a valid helper address."), null))} onDone={() => { setHelper(""); reload(); }} variant="ghost">Authorize</TxButton>
          </div>
        </div>
      )}
      {p.state === "VERDICT_PROPOSED" && (
        <div><TxButton call={calls.acceptVerdict(p.id)} onDone={reload} disabled={wait > 0}>{wait > 0 ? `Accept verdict in ${wait}s` : "Accept verdict"}</TxButton></div>
      )}
      {p.state === "ACCEPTED" && <TxButton call={calls.finalize(p.id)} onDone={reload}>Finalize and pay</TxButton>}
      {recoverable && <TxButton call={calls.recover(p.id)} onDone={reload} variant="ghost">Recover (deadline + 1 day passed)</TxButton>}
      {["FINALIZED", "CANCELLED"].includes(p.state) && <div style={{ color: "var(--muted)" }}>This handover is closed.</div>}
      {problem && <Notice tone="bad">{problem}</Notice>}
    </div>
  );
}

function Rounds({ p }: { p: Handover }) {
  const { data } = useLoad(async () => {
    const out: Verification[] = [];
    for (let i = p.verification_count - 1; i >= 0; i--) out.push(await reads.verification(p.id, i));
    return out;
  }, [p.id, p.verification_count]);
  if (!data?.length) return null;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="label">Verification rounds</div>
      {data.map((v) => (
        <div key={v.round} className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span className="num">Round {v.round + 1} / {v.evidence_count} sources</span><Chip value={v.result} />
          </div>
          <p style={{ color: "var(--muted)", margin: "10px 0 16px" }}>{v.reason}</p>
          {v.answers.map((a) => {
            const req = p.definition.requirements.find((r) => r.id === a.requirement_id);
            return (
              <div key={a.requirement_id} className="row" style={{ gridTemplateColumns: "40px 1fr auto", alignItems: "start" }}>
                <span className="num">{a.requirement_id}</span>
                <span>
                  <span style={{ display: "block" }}>{req?.text}</span>
                  {a.quote && <span className="mono" style={{ display: "block", color: "var(--muted)", fontSize: 12, marginTop: 6 }}>&ldquo;{a.quote}&rdquo; ({a.quote_evidence_id})</span>}
                  {a.note && <span className="label" style={{ display: "block", marginTop: 6 }}>{a.note}</span>}
                </span>
                <Chip value={a.status === "MET" ? "VERIFIED" : a.status === "NOT_MET" ? "NOT_VERIFIED" : "INCONCLUSIVE"} label={a.status.replace("_", " ").toLowerCase()} />
              </div>
            );
          })}
          <div className="label" style={{ marginTop: 14 }}>
            {v.sources.map((s) => `${s.evidence_id}: ${s.availability.toLowerCase()}`).join("  /  ")}
          </div>
        </div>
      ))}
    </div>
  );
}

function WithdrawButton({ p, evidenceId, submitter, reload }: { p: Handover; evidenceId: string; submitter: string; reload: () => void }) {
  const { address } = useWallet();
  const me = (address ?? "").toLowerCase();
  const editable = ["ACTIVE", "EVIDENCE_SUBMITTED"].includes(p.state) ||
    (p.state === "VERDICT_PROPOSED" && ["INCONCLUSIVE", "HANDOVER_DEVIATION"].includes(p.result));
  if (!editable || !(me === p.client || me === p.contractor || me === submitter)) return null;
  return <TxButton call={calls.withdraw(p.id, evidenceId)} onDone={reload} variant="ghost">Withdraw</TxButton>;
}

export default function HandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: p, error, loading, reload } = useLoad(() => (configured ? reads.handover(id) : Promise.resolve(null)), [id]);

  return (
    <div className="wrap" style={{ paddingTop: 72, maxWidth: 940 }}>
      <Link href="/handovers" className="label">&larr; All handovers</Link>
      {error && <div style={{ marginTop: 24 }}><Notice tone="bad">{error}</Notice></div>}
      {loading && !p && <div className="label" style={{ marginTop: 24 }}>Reading the chain...</div>}
      {p && (
        <div style={{ display: "grid", gap: 40, marginTop: 24 }}>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <span className="num">{p.id}</span><Chip value={p.state} />{p.result && <Chip value={p.result} />}
            </div>
            <h1 className="display" style={{ fontSize: "clamp(36px, 6vw, 76px)", margin: 0 }}>{p.title}</h1>
            <p style={{ color: "var(--muted)", fontSize: 17, marginTop: 14 }}>{p.subject}</p>
            <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
              {FLOW.map((s) => <div key={s} title={s} style={{ flex: 1, height: 3, background: FLOW.indexOf(s) <= FLOW.indexOf(p.state) ? "var(--text)" : "var(--line)" }} />)}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
            {[
              ["contractor", <Link key="r" href={`/party/${p.contractor}`} className="mono" style={{ textDecoration: "underline" }}>{shortAddress(p.contractor)}</Link>],
              ["Client", <a key="c" className="mono" href={addressLink(p.client)} target="_blank" rel="noreferrer">{shortAddress(p.client)}</a>],
              ["Deadline", formatTime(p.deadline)],
              ["Final payment locked", formatGen(p.reward)],
              ["Final payment to", shortAddress(p.payee)],
              ["If only mandatory items are met", `${p.definition.payout.partial_bps / 100}%`],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ background: "var(--bg)", padding: 20 }}><div className="label">{k}</div><div style={{ marginTop: 8 }}>{v}</div></div>
            ))}
          </div>

          <div>
            <div className="label" style={{ marginBottom: 6 }}>Checklist{p.fingerprint ? ` / frozen ${p.fingerprint.slice(0, 12)}...` : " / not frozen yet"}</div>
            {p.definition.requirements.map((r) => (
              <div key={r.id} className="row" style={{ gridTemplateColumns: "40px 1fr auto", alignItems: "start" }}>
                <span className="num">{r.id}</span>
                <span>{r.text}{r.rule && <span style={{ display: "block", color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{r.rule}</span>}</span>
                <Chip value="" label={r.mandatory ? "mandatory" : "optional"} />
              </div>
            ))}
            <div className="label" style={{ marginTop: 10 }}>
              Policy: {p.definition.evidence_policy.min_sources} source(s) from {p.definition.evidence_policy.min_publishers} independent publisher(s) per mandatory requirement
            </div>
          </div>

          <div>
            <div className="label" style={{ marginBottom: 6 }}>Evidence ({p.evidence.length})</div>
            {p.evidence.length === 0 && <div style={{ color: "var(--muted)" }}>Nothing registered yet.</div>}
            {p.evidence.map((e) => (
              <div key={e.evidence_id} className="row" style={{ gridTemplateColumns: "40px 1fr auto auto" }}>
                <span className="num">{e.evidence_id}</span>
                <a href={e.url} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: 13, wordBreak: "break-all", textDecoration: "underline" }}>{e.url}</a>
                <span className="label">{e.publisher} / {e.supports.join(" ")} / by {shortAddress(e.submitter)}</span>
                <WithdrawButton p={p} evidenceId={e.evidence_id} submitter={e.submitter} reload={reload} />
              </div>
            ))}
          </div>

          <Rounds p={p} />
          {p.state === "FINALIZED" && (
            <div className="card card-pad">
              <div className="label">Settlement</div>
              <div style={{ marginTop: 8 }}>Paid to the contractor {formatGen(p.paid_to_contractor)} / returned to client {formatGen(p.refunded_to_client)}</div>
            </div>
          )}
          <Actions p={p} reload={reload} />
        </div>
      )}
    </div>
  );
}
