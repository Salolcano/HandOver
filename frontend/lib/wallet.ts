/**
 * The person's own wallet, discovered the way browsers agreed to do it
 * (EIP-6963), with `window.ethereum` as the fallback. No key ever touches
 * this console.
 */
import { CHAIN_ID, EXPLORER_URL, RPC_URL } from "@/lib/config";

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (payload: unknown) => void) => void;
  removeListener?: (event: string, handler: (payload: unknown) => void) => void;
};
export type WalletInfo = { uuid: string; name: string; icon: string; rdns: string };
export type Wallet = { info: WalletInfo; provider: Eip1193Provider };

export function discoverWallets(onFound: (wallets: Wallet[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const found = new Map<string, Wallet>();
  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail as Wallet | undefined;
    if (!detail?.info?.rdns || !detail.provider) return;
    found.set(detail.info.rdns, detail);
    onFound([...found.values()]);
  };
  window.addEventListener("eip6963:announceProvider", handler as EventListener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  // wallets that predate EIP-6963 only inject window.ethereum
  const timer = window.setTimeout(() => {
    const injected = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
    if (injected && found.size === 0) {
      found.set("injected", {
        info: { uuid: "injected", name: "Browser wallet", icon: "", rdns: "injected" },
        provider: injected,
      });
      onFound([...found.values()]);
    }
  }, 400);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("eip6963:announceProvider", handler as EventListener);
  };
}

const KEY = "handover.wallet";
export const rememberWallet = (rdns: string) => { try { localStorage.setItem(KEY, rdns); } catch { /* storage may be blocked */ } };
export const forgetWallet = () => { try { localStorage.removeItem(KEY); } catch { /* as above */ } };
export const rememberedWallet = (): string | null => { try { return localStorage.getItem(KEY); } catch { return null; } };

export async function accountsOf(provider: Eip1193Provider, ask: boolean): Promise<string[]> {
  const accounts = (await provider.request({ method: ask ? "eth_requestAccounts" : "eth_accounts" })) as string[] | undefined;
  return Array.isArray(accounts) ? accounts : [];
}

export async function chainOf(provider: Eip1193Provider): Promise<number> {
  const chain = (await provider.request({ method: "eth_chainId" })) as string | number;
  return typeof chain === "string" ? Number.parseInt(chain, 16) : Number(chain);
}

/** Move the wallet to Studio Next, adding the network once if it is unknown. */
export async function ensureChain(provider: Eip1193Provider): Promise<void> {
  if ((await chainOf(provider)) === CHAIN_ID) return;
  const hex = `0x${CHAIN_ID.toString(16)}`;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code !== 4902 && code !== -32603) throw err;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: hex,
        chainName: "GenLayer Studio Next",
        nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        rpcUrls: [RPC_URL],
        blockExplorerUrls: [EXPLORER_URL],
      }],
    });
  }
}
