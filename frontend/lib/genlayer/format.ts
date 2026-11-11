const WEI = 10n ** 18n;

/**
 * Wei -> GEN, never rounded to nothing.
 *
 * A fee is often far below 0.01 GEN. Rounding to two decimals shows "0 GEN" for
 * a perfectly real deposit, which looks like a free transaction and hides a
 * quote that is (or is not) large enough. This keeps at least five significant
 * digits for any non-zero amount.
 */
export function formatGen(value: bigint | number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  let wei: bigint;
  try {
    wei = BigInt(value);
  } catch {
    return "-";
  }
  const negative = wei < 0n;
  if (negative) wei = -wei;
  if (wei === 0n) return "0 GEN";
  const whole = wei / WEI;
  const frac = (wei % WEI).toString().padStart(18, "0");
  let digits: string;
  if (whole > 0n) {
    digits = frac.slice(0, 4).replace(/0+$/, "");
  } else {
    const firstNonZero = frac.search(/[1-9]/);
    digits = frac.slice(0, firstNonZero + 5).replace(/0+$/, "");
  }
  const text = digits ? `${whole}.${digits}` : `${whole}`;
  return `${negative ? "-" : ""}${text} GEN`;
}

/** "2.5" -> wei. Throws on anything that is not a plain non-negative decimal. */
export function parseGen(input: string): bigint {
  const text = input.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(text)) throw new Error("Enter an amount like 1 or 0.25");
  const [whole, frac = ""] = text.split(".");
  return BigInt(whole) * WEI + BigInt(frac.padEnd(18, "0"));
}

export const shortAddress = (a: string) => (a && a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a);

export function formatTime(seconds: number | string | undefined): string {
  const n = Number(seconds);
  if (!n) return "-";
  return new Date(n * 1000).toISOString().replace("T", " ").replace(/:\d\d\.\d+Z$/, " UTC");
}

export const RESULT_LABEL: Record<string, string> = {
  VERIFIED: "Verified",
  PARTIALLY_VERIFIED: "Partially verified",
  NOT_VERIFIED: "Not verified",
  INCONCLUSIVE: "Inconclusive",
  HANDOVER_DEVIATION: "Handover deviation",
};
