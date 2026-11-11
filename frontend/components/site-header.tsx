"use client";
import Link from "next/link";
import { useState } from "react";

import { shortAddress } from "@/lib/genlayer/format";
import { useWallet } from "./wallet-provider";

export function Mark({ size = 26 }: { size?: number }) {
  return (
    <span aria-hidden style={{ width: size, height: size, borderRadius: "50%", background: "var(--lime)", color: "var(--ink)", display: "inline-grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: size * 0.62, lineHeight: 1 }}>h</span>
  );
}

function WalletButton() {
  const { wallets, address, wrongChain, error, connect, disconnect, switchToStudio } = useWallet();
  const [open, setOpen] = useState(false);

  if (address) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {wrongChain && <button className="btn sm" onClick={switchToStudio}>Switch to Studio Next</button>}
        <button className="btn ghost sm mono" onClick={disconnect} title="Disconnect">{shortAddress(address)}</button>
      </div>
    );
  }
  return (
    <div style={{ position: "relative" }}>
      <button className="btn sm" onClick={() => (wallets.length === 1 ? connect(wallets[0]) : setOpen(!open))}>
        {wallets.length === 0 ? "No wallet found" : "Connect wallet"}
      </button>
      {open && wallets.length > 1 && (
        <div className="card" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", minWidth: 220, zIndex: 30 }}>
          {wallets.map((w) => (
            <button key={w.info.rdns} className="btn ghost sm" style={{ width: "100%", justifyContent: "flex-start", border: 0 }}
              onClick={() => { setOpen(false); void connect(w); }}>
              {w.info.icon && /* eslint-disable-next-line @next/next/no-img-element */ <img src={w.info.icon} alt="" width={18} height={18} />}
              {w.info.name}
            </button>
          ))}
        </div>
      )}
      {error && <div className="label" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", color: "var(--bad)", width: 260, textAlign: "right" }}>{error}</div>}
    </div>
  );
}

export function SiteHeader() {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(11,11,11,.88)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--line)" }}>
      <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, gap: 12 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Mark /><span className="display" style={{ fontSize: 24 }}>handover</span>
        </Link>
        <nav style={{ display: "flex", gap: 26, fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>
          <Link href="/registry" className="hide-sm">record</Link>
          <Link href="/handovers" className="hide-sm">handovers</Link>
          <Link href="/handovers/new" className="hide-sm">start one</Link>
        </nav>
        <WalletButton />
      </div>
      <style>{`@media (max-width: 640px){ .hide-sm{ display:none } }`}</style>
    </header>
  );
}
