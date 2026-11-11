"use client";
import { useState } from "react";

import { runAct, idle, type TxState } from "@/lib/genlayer/acts";
import type { Call } from "@/lib/genlayer/contract";
import { formatGen } from "@/lib/genlayer/format";
import { configured } from "@/lib/config";
import { useWallet } from "./wallet-provider";

/**
 * A button that runs one contract write and shows every stage under it:
 * fee quote (in GEN, never rounded to 0) -> wallet -> consensus -> result.
 */
export function TxButton({
  call, children, onDone, variant = "", disabled = false,
}: {
  call: Call | (() => Call | null);
  children: React.ReactNode;
  onDone?: () => void;
  variant?: "" | "ghost";
  disabled?: boolean;
}) {
  const { provider, address, wrongChain } = useWallet();
  const [tx, setTx] = useState<TxState>(idle);
  const busy = tx.stage === "quote" || tx.stage === "sign" || tx.stage === "consensus";

  const go = async () => {
    const c = typeof call === "function" ? call() : call;
    if (!c) return;
    const final = await runAct(provider, address, c, setTx);
    if (final.stage === "done") onDone?.();
  };

  return (
    <div style={{ display: "inline-block", maxWidth: "100%", verticalAlign: "top" }}>
      <button className={`btn ${variant}`} disabled={disabled || busy || !configured || !address || wrongChain} onClick={go}>
        {busy ? "Working..." : children}
      </button>
      {!address && <div className="label" style={{ marginTop: 8 }}>Connect a wallet to sign</div>}
      {address && wrongChain && <div className="label" style={{ marginTop: 8, color: "var(--warn)" }}>Switch your wallet to Studio Next</div>}
      {tx.stage !== "idle" && (
        <div className="mono" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, color: tx.stage === "failed" ? "var(--bad)" : tx.stage === "done" ? "var(--ok)" : "var(--muted)", maxWidth: 420 }}>
          {tx.feeValue !== undefined && <div>Fee deposit: {formatGen(tx.feeValue)}{tx.attempt ? ` (raised x${2 ** tx.attempt})` : ""}</div>}
          <div>{tx.message}</div>
          {tx.link && <a href={tx.link} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>View in explorer</a>}
        </div>
      )}
    </div>
  );
}
