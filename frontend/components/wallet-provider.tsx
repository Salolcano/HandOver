"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { CHAIN_ID } from "@/lib/config";
import {
  accountsOf, chainOf, discoverWallets, forgetWallet, rememberWallet, rememberedWallet,
  ensureChain, type Eip1193Provider, type Wallet,
} from "@/lib/wallet";

type Ctx = {
  wallets: Wallet[];
  address: string | null;
  provider: Eip1193Provider | null;
  wrongChain: boolean;
  error: string;
  connect: (wallet: Wallet) => Promise<void>;
  disconnect: () => void;
  switchToStudio: () => Promise<void>;
};

const WalletContext = createContext<Ctx | null>(null);
export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet outside WalletProvider");
  return ctx;
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [active, setActive] = useState<Wallet | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [wrongChain, setWrongChain] = useState(false);
  const [error, setError] = useState("");
  const restored = useRef(false);

  useEffect(() => discoverWallets(setWallets), []);

  const bind = useCallback(async (wallet: Wallet, ask: boolean) => {
    const accounts = await accountsOf(wallet.provider, ask);
    if (!accounts[0]) return false;
    setActive(wallet);
    setAddress(accounts[0]);
    setWrongChain((await chainOf(wallet.provider)) !== CHAIN_ID);
    rememberWallet(wallet.info.rdns);
    return true;
  }, []);

  const connect = useCallback(async (wallet: Wallet) => {
    setError("");
    try {
      await bind(wallet, true);
      await ensureChain(wallet.provider);
      setWrongChain((await chainOf(wallet.provider)) !== CHAIN_ID);
    } catch (err) {
      const e = err as { code?: number; message?: string };
      setError(e?.code === 4001 ? "Connection rejected in the wallet." : String(e?.message ?? "Could not connect."));
    }
  }, [bind]);

  // quietly restore the last wallet if it is still unlocked and authorised
  useEffect(() => {
    if (restored.current || wallets.length === 0) return;
    const wanted = rememberedWallet();
    const match = wallets.find((w) => w.info.rdns === wanted);
    if (!match) return;
    restored.current = true;
    void bind(match, false).catch(() => undefined);
  }, [wallets, bind]);

  // follow the wallet when the person switches account or network inside it
  useEffect(() => {
    if (!active) return;
    const onAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      setAddress(list?.[0] ?? null);
      if (!list?.[0]) setActive(null);
    };
    const onChain = () => void chainOf(active.provider).then((id) => setWrongChain(id !== CHAIN_ID));
    active.provider.on?.("accountsChanged", onAccounts);
    active.provider.on?.("chainChanged", onChain);
    return () => {
      active.provider.removeListener?.("accountsChanged", onAccounts);
      active.provider.removeListener?.("chainChanged", onChain);
    };
  }, [active]);

  const disconnect = useCallback(() => { forgetWallet(); setActive(null); setAddress(null); }, []);
  const switchToStudio = useCallback(async () => {
    if (!active) return;
    try { await ensureChain(active.provider); setWrongChain(false); } catch (e) {
      setError(String((e as Error)?.message ?? "Could not switch network."));
    }
  }, [active]);

  const value = useMemo<Ctx>(() => ({
    wallets, address, provider: active?.provider ?? null, wrongChain, error, connect, disconnect, switchToStudio,
  }), [wallets, address, active, wrongChain, error, connect, disconnect, switchToStudio]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
