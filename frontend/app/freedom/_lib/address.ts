import { getAddress, type Address } from "viem";

export type AddressCheck =
  | { ok: true; address: Address; checksum: "valid" | "none" }
  | { ok: false; message: string };

// EIP-55: mixed case carries a checksum and must match it. All-lowercase or all-uppercase
// has no checksum to verify, so it is accepted with a gentle note instead of silently fixed.
export function checkAddressInput(input: string): AddressCheck {
  const t = input.trim();
  if (!t) return { ok: false, message: "Enter an address. It starts with 0x." };
  if (/\.(eth|base|box)$/i.test(t)) {
    return { ok: false, message: "Names like this aren't supported yet. Paste the full 0x address instead." };
  }
  if (!/^0x/i.test(t)) return { ok: false, message: "An address starts with 0x. Check that you copied all of it." };
  const body = t.slice(2);
  if (/[^0-9a-fA-F]/.test(body)) {
    return { ok: false, message: "An address only uses the digits 0 to 9 and the letters a to f after 0x." };
  }
  if (body.length !== 40) {
    return {
      ok: false,
      message: `An address has 40 characters after 0x. This one has ${body.length}. Check that you copied all of it.`,
    };
  }
  if (/^0+$/.test(body)) return { ok: false, message: "That's the zero address, which nobody owns." };
  const lower = body === body.toLowerCase();
  const upper = body === body.toUpperCase();
  const address = getAddress(`0x${body.toLowerCase()}`);
  if (lower || upper) return { ok: true, address, checksum: "none" };
  if (address.slice(2) !== body) {
    return {
      ok: false,
      message:
        "This address has a typo: its capital letters don't match its checksum. Copy it again from your wallet's receive screen.",
    };
  }
  return { ok: true, address, checksum: "valid" };
}

export function sameAddress(a?: string | null, b?: string | null) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}
