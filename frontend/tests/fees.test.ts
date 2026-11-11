import { describe, expect, it } from "vitest";

import { formatGen, parseGen } from "@/lib/genlayer/format";
import {
  FeeError, assertUsableQuote, isBudgetTooLow, profileFor, submitWithFees,
} from "@/lib/genlayer/fees";

const write = { address: "0x" + "1".repeat(40), functionName: "freeze_handover", args: ["P1"] };

function fakeClient(opts: { simulate?: () => unknown; failTimes?: number; fallbackFee?: bigint }) {
  const calls = { estimates: [] as unknown[], writes: [] as unknown[] };
  let failures = opts.failTimes ?? 0;
  return {
    calls,
    estimateTransactionFeesForWrite: async () => { if (!opts.simulate) throw new Error("cannot simulate"); return opts.simulate(); },
    estimateTransactionFees: async (profile: unknown) => {
      calls.estimates.push(profile);
      return { distribution: { fromProfile: profile }, feeValue: opts.fallbackFee ?? 153_611_700_002_588n };
    },
    writeContract: async (args: unknown) => {
      calls.writes.push(args);
      if (failures-- > 0) throw Object.assign(new Error("execution reverted: BudgetTooLow(1,2)"), { code: 3 });
      return "0xhash";
    },
  };
}

describe("formatGen", () => {
  it("never shows a real fee as 0", () => {
    expect(formatGen(153_611_700_002_588n)).toBe("0.00015361 GEN");
    expect(formatGen(78_852_000_000_000n)).toBe("0.000078852 GEN");
    expect(formatGen(1n)).toBe("0.000000000000000001 GEN");
  });
  it("formats whole and mixed amounts", () => {
    expect(formatGen(0n)).toBe("0 GEN");
    expect(formatGen(10n ** 18n)).toBe("1 GEN");
    expect(formatGen(25n * 10n ** 17n)).toBe("2.5 GEN");
    expect(formatGen(null)).toBe("-");
  });
  it("parses what people type", () => {
    expect(parseGen("2.5")).toBe(25n * 10n ** 17n);
    expect(parseGen("0")).toBe(0n);
    expect(() => parseGen("-1")).toThrow();
    expect(() => parseGen("1e3")).toThrow();
  });
});

describe("fee quotes", () => {
  it("rejects a zero quote before a wallet is ever asked", () => {
    expect(() => assertUsableQuote({ distribution: {}, feeValue: 0n })).toThrow(FeeError);
    expect(() => assertUsableQuote({ feeValue: 5n })).toThrow(FeeError);
    expect(assertUsableQuote({ distribution: {}, feeValue: "42" }).feeValue).toBe(42n);
  });
  it("recognises BudgetTooLow however it is wrapped", () => {
    expect(isBudgetTooLow(new Error("BudgetTooLow(1,2)"))).toBe(true);
    expect(isBudgetTooLow({ shortMessage: "reverted", cause: { message: "BudgetTooLow" } })).toBe(true);
    expect(isBudgetTooLow(new Error("user rejected"))).toBe(false);
  });
  it("doubles the time units on every retry", () => {
    expect(profileFor("light", 0).leaderTimeunitsAllocation).toBe(100n);
    expect(profileFor("light", 2).leaderTimeunitsAllocation).toBe(400n);
    expect(profileFor("verify", 1).validatorTimeunitsAllocation).toBe(800n);
  });
});

describe("submitWithFees", () => {
  it("submits the SDK's distribution and feeValue unchanged", async () => {
    const client = fakeClient({ simulate: () => ({ distribution: { d: 1 }, feeValue: 999n }) });
    const hash = await submitWithFees(client, write, "light");
    expect(hash).toBe("0xhash");
    expect((client.calls.writes[0] as { fees: unknown }).fees).toEqual({ distribution: { d: 1 }, feeValue: 999n });
  });
  it("falls back to a profile quote when simulation is unavailable", async () => {
    const client = fakeClient({});
    await submitWithFees(client, write, "verify");
    expect(client.calls.estimates).toHaveLength(1);
  });
  it("re-quotes with a bigger budget after BudgetTooLow, then succeeds", async () => {
    const client = fakeClient({ failTimes: 2 });
    const quoted: number[] = [];
    await submitWithFees(client, write, "light", (_q, attempt) => quoted.push(attempt));
    expect(quoted).toEqual([0, 1, 2]);
    expect((client.calls.estimates[1] as { leaderTimeunitsAllocation: bigint }).leaderTimeunitsAllocation).toBe(200n);
  });
  it("gives up with a clear error after three BudgetTooLow answers", async () => {
    const client = fakeClient({ failTimes: 9 });
    await expect(submitWithFees(client, write, "light")).rejects.toThrow(/BudgetTooLow/);
    expect(client.calls.writes).toHaveLength(3);
  });
  it("does not retry a wallet rejection", async () => {
    const client = fakeClient({});
    client.writeContract = async () => { throw Object.assign(new Error("User rejected"), { code: 4001 }); };
    await expect(submitWithFees(client, write, "light")).rejects.toThrow(/rejected/i);
  });
  it("refuses to send when the quote is 0", async () => {
    const client = fakeClient({ fallbackFee: 0n });
    await expect(submitWithFees(client, write, "light")).rejects.toThrow(FeeError);
    expect(client.calls.writes).toHaveLength(0);
  });
});
