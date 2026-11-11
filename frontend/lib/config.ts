/** Everything the console needs to know about where it is pointed. */
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://studio-next.genlayer.com/api";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 61997);
export const EXPLORER_URL = (
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer-studio-dev.genlayer.com"
).replace(/\/$/, "");
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_HANDOVER_ADDRESS || "").trim();

export const configured = /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);

export const txLink = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const addressLink = (address: string) => `${EXPLORER_URL}/address/${address}`;
