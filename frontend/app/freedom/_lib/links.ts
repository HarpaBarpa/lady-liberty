import { CHAIN_ID } from "./config";

// One EIP-681 request encodes exactly one call, so every token gets its own link and QR code.
// The amount is a plain base-10 integer in raw units (no exponent form), and @4663 pins the
// network so a wallet can't apply it to whatever chain it happens to be on.

export function eip681Transfer(token: string, vault: string, raw: bigint) {
  return `ethereum:${token}@${CHAIN_ID}/transfer?address=${vault}&uint256=${raw.toString(10)}`;
}

// MetaMask's documented mobile send link. With an explicit chain ID it switches network itself.
export function metamaskTransfer(token: string, vault: string, raw: bigint) {
  return `https://link.metamask.io/send/${token}@${CHAIN_ID}/transfer?address=${vault}&uint256=${raw.toString(10)}`;
}

// Opens a page inside MetaMask mobile's own browser, for the connected door on a phone.
export function metamaskDapp(url: string) {
  return `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, "")}`;
}
