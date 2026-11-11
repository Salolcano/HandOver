/**
 * The only way this console talks to GenLayer.
 *
 * Two clients:
 *   readClient()  -- no wallet; a throwaway account that can sign nothing.
 *   writeClient() -- bound to the wallet the person connected.
 *
 * FIX ("No account set"): the signing client used to be created with
 * `account: undefined`, so genlayer-js had no `from` address and every write
 * failed BEFORE the wallet (Rabby, MetaMask...) was ever asked. A browser
 * wallet signs for you, but the SDK still has to be told WHICH address it is
 * signing for. We pass the connected address itself (not a private key).
 */
import { createClient, createAccount } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

import { CHAIN_ID, EXPLORER_URL, RPC_URL } from "@/lib/config";

/** Studio Next = the v0.6 release-candidate Studio (chain 61997). */
export const chain = {
  ...studioDevnet,
  id: CHAIN_ID,
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "GenLayer Explorer", url: EXPLORER_URL } },
} as typeof studioDevnet;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Client = any;

export class NoAccountError extends Error {
  constructor() {
    super("Connect a wallet first: there is no account to sign with.");
    this.name = "NoAccountError";
  }
}

let reader: Client | undefined;

export function readClient(): Client {
  if (!reader) reader = createClient({ chain, account: createAccount() });
  return reader;
}

export function writeClient(provider: unknown, address: string | null | undefined): Client {
  if (!provider) throw new NoAccountError();
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) throw new NoAccountError();
  return createClient({
    chain,
    account: address as `0x${string}`, // the address, so the SDK knows who signs
    provider, // the wallet, which does the signing
  } as never);
}
