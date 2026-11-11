/**
 * Fees on Studio Next (Consensus v0.6).
 *
 * Every deploy and write must carry a `FeesDistribution` and the quoted
 * `feeValue`. Unused budget is refunded at finalization.
 *
 * FIX ("BudgetTooLow"): that error means the execution budget in the
 * transaction is below the minimum the consensus contract will admit. Two
 * things cause it, and both are handled here:
 *
 *  1. An old SDK that priced the receipt floor too low. genlayer-js
 *     2.0.0-rc.2 prices the floor with the receipt wrapper + terminal reserve
 *     (matches Consensus v0.6); this app pins that version.
 *  2. A hand-written fee. We never do arithmetic: every number comes from the
 *     SDK's own estimate, and `distribution` + `feeValue` are submitted
 *     UNCHANGED. A quote of 0 is rejected before the wallet opens.
 *
 * If the chain still answers BudgetTooLow (the fee policy can move between
 * RC builds), we re-quote with doubled time-unit allocations, up to 3 times,
 * instead of leaving the person with a dead button.
 */
import type { Client } from "./client";

export type FeeKind = "light" | "verify";

export type Write = {
  address: string;
  functionName: string;
  args: (string | number | bigint)[];
  value?: bigint;
};

export type Quote = { distribution: unknown; feeValue: bigint };

/** Time units for the fallback quote. Verification fetches pages and asks a model. */
const BASE = {
  light: { leader: 100n, validator: 200n },
  verify: { leader: 200n, validator: 400n },
} as const;

export const MAX_ATTEMPTS = 3;

export class FeeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeeError";
  }
}

export function profileFor(kind: FeeKind, attempt: number) {
  const scale = 2n ** BigInt(Math.max(0, attempt));
  return {
    leaderTimeunitsAllocation: BASE[kind].leader * scale,
    validatorTimeunitsAllocation: BASE[kind].validator * scale,
    rotations: [0n],
  };
}

export function isBudgetTooLow(err: unknown): boolean {
  const e = err as { message?: string; shortMessage?: string; details?: string; data?: unknown; cause?: unknown };
  let blob = [e?.message, e?.shortMessage, e?.details].filter(Boolean).join(" ");
  try {
    blob += " " + JSON.stringify({ data: e?.data, cause: (e?.cause as { message?: string })?.message });
  } catch {
    /* circular error objects are fine to ignore */
  }
  return /BudgetTooLow/i.test(blob);
}

/** A quote the wallet may be asked to sign. Throws before that if it is not one. */
export function assertUsableQuote(estimate: { distribution?: unknown; feeValue?: unknown } | null | undefined): Quote {
  if (!estimate || estimate.distribution === undefined || estimate.distribution === null) {
    throw new FeeError("The network returned no fee distribution, so no transaction was sent. Try again in a moment.");
  }
  let feeValue: bigint;
  try {
    feeValue = BigInt(estimate.feeValue as bigint | string | number);
  } catch {
    throw new FeeError("The network returned an unreadable fee quote, so no transaction was sent.");
  }
  if (feeValue <= 0n) {
    throw new FeeError(
      "The fee quote came back as 0 GEN, which is below the network's minimum execution budget " +
        "(BudgetTooLow). Nothing was sent. Reload the page and try again; if it repeats, the RPC is serving stale fee data.",
    );
  }
  return { distribution: estimate.distribution, feeValue };
}

export async function quote(client: Client, write: Write, kind: FeeKind, attempt: number): Promise<Quote> {
  let estimate: { distribution?: unknown; feeValue?: unknown } | undefined;
  if (attempt === 0 && typeof client.estimateTransactionFeesForWrite === "function") {
    try {
      // Studio simulates the exact call and derives the preset from what it used.
      estimate = await client.estimateTransactionFeesForWrite({ ...write, value: write.value ?? 0n });
    } catch {
      estimate = undefined; // Studio cannot simulate every write (e.g. ones that fetch web pages)
    }
  }
  if (!estimate) estimate = await client.estimateTransactionFees(profileFor(kind, attempt));
  return assertUsableQuote(estimate);
}

/** Estimate, show the quote, sign, submit -- retrying only the BudgetTooLow case. */
export async function submitWithFees(
  client: Client,
  write: Write,
  kind: FeeKind,
  onQuote?: (q: Quote, attempt: number) => void,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const q = await quote(client, write, kind, attempt);
    onQuote?.(q, attempt);
    try {
      const hash = await client.writeContract({
        ...write,
        value: write.value ?? 0n,
        fees: { distribution: q.distribution, feeValue: q.feeValue },
      });
      return String(hash);
    } catch (err) {
      if (!isBudgetTooLow(err)) throw err;
    }
  }
  throw new FeeError(
    "The network kept answering BudgetTooLow even after the fee was raised three times. " +
      "Nothing was charged. Please report this with the transaction link from the explorer.",
  );
}
