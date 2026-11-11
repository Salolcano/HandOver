/**
 * What the contract returns and what this console may send it.
 * Method names and argument order are written down once, here.
 */
import { CONTRACT_ADDRESS } from "@/lib/config";
import { readClient } from "./client";
import type { FeeKind } from "./fees";

/** genlayer-js hands back Maps and bigints; the UI wants plain objects. */
export function plain(value: unknown): unknown {
  if (value instanceof Map) return Object.fromEntries([...value].map(([k, v]) => [String(k), plain(v)]));
  if (Array.isArray(value)) return value.map(plain);
  if (typeof value === "bigint") return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as object).map(([k, v]) => [k, plain(v)]));
  }
  return value;
}

export type Requirement = { id: string; text: string; rule: string; mandatory: boolean };
export type Definition = {
  requirements: Requirement[];
  evidence_policy: { min_sources: number; min_publishers: number };
  payout: { partial_bps: number };
};
export type EvidenceRow = {
  evidence_id: string; url: string; publisher: string; supports: string[]; submitter: string; registered_at: number;
};
export type Handover = {
  id: string; title: string; subject: string; client: string; contractor: string; deadline: number;
  definition: Definition; payee: string; fingerprint: string; state: string; reward: string;
  created_at: number; frozen_at: number; evidence_ids: string[]; evidence_seq: number; submitters: string[]; verification_count: number;
  result: string; result_reason: string; proposed_at: number; finalized_at: number;
  paid_to_contractor: string; refunded_to_client: string; evidence: EvidenceRow[];
  accept_delay: number; recovery_window: number;
};
export type HandoverSummary = Omit<Handover, "definition" | "evidence" | "accept_delay" | "recovery_window">;
export type Answer = { requirement_id: string; status: string; quote: string; quote_evidence_id: string; note?: string };
export type Verification = {
  round: number; evidence_count: number; answers: Answer[];
  sources: { evidence_id: string; availability: string }[]; result: string; reason: string; proposed_at: number;
};
export type Page<T> = { total: number; items: T[] };
export type PartyRecord = {
  party: string; total: number; counts: Record<string, number>; verified_bps: number;
  entries: { handover_id: string; title: string; result: string; finalized_at: number; fingerprint: string }[];
};
export type Info = {
  version: string; handover_count: number; registry_count: number; custody: string;
  accept_delay: number; recovery_window: number; max_requirements: number; max_evidence: number;
  max_per_delegate: number; reserved_for_owners: number; max_delegates: number;
};

async function read<T>(functionName: string, args: (string | number)[] = []): Promise<T> {
  const raw = await readClient().readContract({ address: CONTRACT_ADDRESS, functionName, args });
  return plain(raw) as T;
}

export const reads = {
  info: () => read<Info>("get_info"),
  handover: (id: string) => read<Handover>("get_handover", [id]),
  handovers: (offset = 0, limit = 20) => read<Page<HandoverSummary>>("list_handovers", [offset, limit]),
  verification: (id: string, round: number) => read<Verification>("get_verification", [id, round]),
  registry: (result = "", offset = 0, limit = 20) => read<Page<HandoverSummary>>("list_registry", [result, offset, limit]),
  party: (address: string) => read<PartyRecord>("get_party_record", [address]),
  activity: (offset = 0, limit = 12) =>
    read<Page<{ handover_id: string; state: string; note: string; at: number }>>("list_activity", [offset, limit]),
};

export type Call = {
  functionName: string;
  args: (string | number | bigint)[];
  value: bigint;
  kind: FeeKind;
  label: string;
};
const call = (label: string, functionName: string, args: Call["args"] = [], value = 0n, kind: FeeKind = "light"): Call =>
  ({ label, functionName, args, value, kind });

export const calls = {
  create: (title: string, subject: string, contractor: string, deadline: number, definition: Definition) =>
    call("Create handover", "create_handover", [title, subject, contractor, deadline, JSON.stringify(definition)]),
  fund: (id: string, wei: bigint) => call("Fund handover", "fund_handover", [id], wei),
  freeze: (id: string) => call("Freeze handover", "freeze_handover", [id]),
  accept: (id: string) => call("Accept handover", "accept_handover", [id]),
  cancel: (id: string) => call("Cancel handover", "cancel_handover", [id]),
  evidence: (id: string, url: string, supports: string) => call("Register evidence", "submit_evidence", [id, url, supports]),
  authorize: (id: string, who: string) => call("Authorize submitter", "authorize_submitter", [id, who]),
  revoke: (id: string, who: string) => call("Revoke submitter", "revoke_submitter", [id, who]),
  withdraw: (id: string, evidenceId: string) => call("Withdraw evidence", "withdraw_evidence", [id, evidenceId]),
  replace: (id: string, evidenceId: string, url: string, supports: string) =>
    call("Replace evidence", "replace_evidence", [id, evidenceId, url, supports]),
  verify: (id: string) => call("Verify evidence", "request_verification", [id], 0n, "verify"),
  acceptVerdict: (id: string) => call("Accept verdict", "accept_verification", [id]),
  finalize: (id: string) => call("Finalize and pay", "finalize_handover", [id]),
  recover: (id: string) => call("Recover handover", "recover_handover", [id]),
};
