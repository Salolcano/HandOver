/** What went wrong, in a sentence a person can act on. */
const TAGS = ["[EXPECTED]", "[EXTERNAL]", "[TRANSIENT]", "[LLM_ERROR]", "[REFUNDED]"];

export function refusalSentence(text: string): string {
  let out = (text ?? "").trim();
  for (const tag of TAGS) if (out.startsWith(tag)) out = out.slice(tag.length).trim();
  out = out.replace(/\b\d{10}\b/g, (d) => {
    const v = Number(d);
    return v > 1_600_000_000 && v < 4_000_000_000
      ? new Date(v * 1000).toISOString().replace("T", " ").replace(/:\d\d\.\d+Z$/, " UTC")
      : d;
  });
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function explain(err: unknown): string {
  const e = err as { code?: number; name?: string; message?: string; shortMessage?: string };
  const raw = String(e?.shortMessage ?? e?.message ?? err ?? "");
  if (e?.code === 4001 || /user rejected|user denied|rejected the request/i.test(raw)) {
    return "You rejected the request in your wallet. Nothing was sent.";
  }
  if (e?.name === "NoAccountError" || /no account set/i.test(raw)) {
    return "No wallet account is connected. Connect your wallet and try again.";
  }
  if (e?.name === "FeeError") return raw;
  if (/BudgetTooLow/i.test(raw)) {
    return "The fee budget was below the network minimum. Try again; the console will request a larger quote.";
  }
  if (/insufficient funds|insufficient balance/i.test(raw)) {
    return "This account does not hold enough GEN to cover the amount plus the fee deposit.";
  }
  if (/chain|network/i.test(raw) && /mismatch|wrong|switch/i.test(raw)) {
    return "Your wallet is on a different network. Switch to GenLayer Studio Next and retry.";
  }
  const tagged = raw.match(/\[(EXPECTED|EXTERNAL|TRANSIENT|LLM_ERROR|REFUNDED)\][^\n]*/);
  if (tagged) return refusalSentence(tagged[0]);
  return raw.length > 280 ? raw.slice(0, 280) + "..." : raw || "The transaction failed.";
}
