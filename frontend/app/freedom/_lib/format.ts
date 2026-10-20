import { formatUnits } from "viem";
import type { Price } from "./prices";

// Groups an address into fours so people can compare every character, not only the ends.
export function addressGroups(address: string): string[] {
  const body = address.slice(2);
  const groups = ["0x"];
  for (let i = 0; i < body.length; i += 4) groups.push(body.slice(i, i + 4));
  return groups;
}

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Human amount with up to `max` significant digits, never in exponent form.
export function tokenAmount(raw: bigint, decimals: number, max = 6): string {
  const full = formatUnits(raw, decimals);
  const [whole, frac = ""] = full.split(".");
  if (whole !== "0") {
    const keep = Math.max(0, max - whole.length);
    const f = frac.slice(0, keep).replace(/0+$/, "");
    return `${Number(whole).toLocaleString("en-US")}${f ? `.${f}` : ""}`;
  }
  const lead = frac.match(/^0*/)?.[0].length ?? 0;
  if (lead >= 12) return `less than 0.000000000001`;
  const f = frac.slice(0, lead + max).replace(/0+$/, "");
  return f ? `0.${f}` : "0";
}

export function fullTokenAmount(raw: bigint, decimals: number): string {
  return formatUnits(raw, decimals);
}

const usdFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function usd(n: number | null): string {
  if (n === null) return "No price";
  if (n > 0 && n < 0.01) return "under $0.01";
  return usdFmt.format(n);
}

export function usdPrecise(n: number | null): string {
  if (n === null) return "unknown";
  if (n > 0 && n < 0.0001) return "under $0.0001";
  if (n < 1) return `$${n.toFixed(4)}`;
  return usdFmt.format(n);
}

export function eth(wei: bigint | null): string {
  if (wei === null) return "unknown";
  const s = formatUnits(wei, 18);
  const [w, f = ""] = s.split(".");
  const lead = f.match(/^0*/)?.[0].length ?? 0;
  const trimmed = f.slice(0, lead + 3).replace(/0+$/, "");
  return `${w}${trimmed ? `.${trimmed}` : ""} ETH`;
}

export function when(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function priceLabel(p: Price): string {
  if (p.state === "fresh") return `Live price, ${p.source}`;
  if (p.state === "last-known" && p.asOf) return `Last price from ${when(p.asOf)}${p.note ? `, ${p.note.toLowerCase()}` : ""}`;
  return p.note ? `No price: ${p.note.toLowerCase()}` : "No price available";
}
