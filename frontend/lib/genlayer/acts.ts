/**
 * One write, start to finish: quote -> wallet signature -> consensus -> result.
 * Every stage is reported so the person is never staring at a silent button.
 */
import { CONTRACT_ADDRESS, txLink } from "@/lib/config";
import { NoAccountError, readClient, writeClient } from "./client";
import type { Call } from "./contract";
import { explain, refusalSentence } from "./errors";
import { submitWithFees } from "./fees";
import { ensureChain, type Eip1193Provider } from "@/lib/wallet";

export type Stage = "idle" | "quote" | "sign" | "consensus" | "done" | "failed";
export type TxState = {
  stage: Stage;
  message: string;
  hash?: string;
  link?: string;
  feeValue?: bigint;
  attempt?: number;
};
export const idle: TxState = { stage: "idle", message: "" };

const FAILED = new Set(["UNDETERMINED", "CANCELED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Receipt = {
  statusName?: string;
  txExecutionResultName?: string;
  resultName?: string;
  consensus_data?: { leader_receipt?: { stderr?: string; genvm_result?: { stderr?: string } }[] };
};

function refusalOf(tx: Receipt): string | null {
  const result = tx.txExecutionResultName ?? tx.resultName;
  if (!result || result === "FINISHED_WITH_RETURN") return null;
  const receipts = tx.consensus_data?.leader_receipt ?? [];
  const text = receipts.map((r) => r.genvm_result?.stderr || r.stderr || "").join(" ");
  const tagged = text.match(/\[(EXPECTED|EXTERNAL|TRANSIENT|LLM_ERROR|REFUNDED)\][^\n"]*/);
  return tagged
    ? refusalSentence(tagged[0])
    : "The contract refused this call. Open the transaction in the explorer to see why.";
}

export async function runAct(
  provider: Eip1193Provider | null,
  address: string | null,
  call: Call,
  onUpdate: (s: TxState) => void,
): Promise<TxState> {
  let state: TxState = { stage: "quote", message: "Requesting a fee quote from the network..." };
  const set = (patch: Partial<TxState>) => { state = { ...state, ...patch }; onUpdate(state); return state; };
  const fail = (message: string) => set({ stage: "failed", message });
  set({});

  let hash: string;
  try {
    if (!provider || !address) throw new NoAccountError();
    await ensureChain(provider);
    const client = writeClient(provider, address);
    hash = await submitWithFees(
      client,
      { address: CONTRACT_ADDRESS, functionName: call.functionName, args: call.args, value: call.value },
      call.kind,
      (q, attempt) =>
        set({
          stage: "sign",
          feeValue: q.feeValue,
          attempt,
          message: "Confirm in your wallet. The fee deposit is held up front and unused budget is refunded.",
        }),
    );
  } catch (err) {
    return fail(explain(err));
  }
  set({ stage: "consensus", hash, link: txLink(hash), message: "Submitted. Validators are reaching consensus..." });

  const started = Date.now();
  for (;;) {
    let tx: Receipt | undefined;
    try {
      tx = (await readClient().getTransaction({ hash })) as Receipt;
    } catch {
      /* a transient read failure: keep polling */
    }
    const status = tx?.statusName;
    if (status && FAILED.has(status)) {
      return fail("The validators did not reach a decision, so nothing changed. It can be sent again.");
    }
    if (tx && (status === "ACCEPTED" || status === "FINALIZED")) {
      const refusal = refusalOf(tx);
      if (refusal) return fail(refusal);
      return set({ stage: "done", message: status === "FINALIZED" ? "Finalized." : "Accepted by consensus." });
    }
    if (Date.now() - started > 20 * 60_000) {
      return fail("This is taking longer than twenty minutes. It may still complete; reload later.");
    }
    if (status) set({ message: `Consensus in progress (${status.toLowerCase()})...` });
    await sleep(4000);
  }
}
