import { BaseError, decodeFunctionData, erc20Abi, toFunctionSelector, type Address, type Hex } from "viem";
import { sameAddress } from "./address";
import { isAllowListed, type Registry } from "./registry";
import { transferData } from "./scan";

// The only call this app ever asks a wallet to make: transfer(vault, amount) on an allow-listed
// Stock Token, with no ETH attached. No approve, permit, Permit2, signature or EIP-7702 upgrade
// exists anywhere in this code path. Every call is rebuilt and decoded here right before the
// wallet prompt, so a bug elsewhere cannot turn it into something else.

export const TRANSFER_SELECTOR = toFunctionSelector("transfer(address,uint256)"); // 0xa9059cbb

export type PlainTransfer = { to: Address; data: Hex; value: 0n };

export function buildPlainTransfer(
  registry: Registry,
  token: Address,
  vault: Address,
  owner: Address,
  amount: bigint,
): PlainTransfer {
  if (!isAllowListed(registry, token)) throw new Error("This token isn't on Robinhood's Stock Token list.");
  if (sameAddress(vault, token)) throw new Error("The vault address can't be a token contract.");
  if (sameAddress(vault, owner)) throw new Error("The vault address is the same as the sender.");
  if (amount <= 0n) throw new Error("There is nothing to send.");
  const data = transferData(vault, amount);
  const decoded = decodeFunctionData({ abi: erc20Abi, data });
  if (
    !data.startsWith(TRANSFER_SELECTOR) ||
    decoded.functionName !== "transfer" ||
    !sameAddress(decoded.args[0] as Address, vault) ||
    decoded.args[1] !== amount
  ) {
    throw new Error("The prepared call didn't match a plain transfer to the vault, so it was not sent.");
  }
  return { to: token, data, value: 0n };
}

export function errorCode(e: unknown): number | undefined {
  let code: number | undefined;
  const pick = (err: unknown) => {
    const c = (err as { code?: unknown })?.code;
    if (typeof c === "number") {
      code = c;
      return true;
    }
    return false;
  };
  if (e instanceof BaseError) e.walk(pick);
  else pick(e);
  return code;
}

export function isUserRejection(e: unknown) {
  return errorCode(e) === 4001;
}

// EIP-5792 errors that mean "this wallet can't do it as one confirmation".
export function isBatchUnsupported(e: unknown) {
  const c = errorCode(e);
  return c === 5700 || c === 5710 || c === 5740 || c === 5750 || c === 5760 || c === -32601 || c === 4200;
}

export function shortError(e: unknown): string {
  if (e instanceof BaseError) return e.shortMessage;
  if (e instanceof Error) return e.message;
  return "Unknown error.";
}
