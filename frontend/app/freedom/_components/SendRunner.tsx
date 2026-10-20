"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address, Hash } from "viem";
import { sendCalls, sendTransaction, waitForCallsStatus, waitForTransactionReceipt } from "viem/actions";
import type { Config } from "wagmi";
import { getConnection, getConnectorClient } from "wagmi/actions";
import { sameAddress } from "../_lib/address";
import { explorer, publicClient, robinhood } from "../_lib/chain";
import { CHAIN_ID } from "../_lib/config";
import { shortAddress, tokenAmount } from "../_lib/format";
import type { Registry } from "../_lib/registry";
import type { Holding } from "../_lib/scan";
import { buildPlainTransfer, isBatchUnsupported, isUserRejection, shortError, type PlainTransfer } from "../_lib/send";
import s from "../freedom.module.css";
import { ExternalLink, StepHeading, useAnnounce } from "./ui";

export type ItemStatus =
  | { kind: "queued" }
  | { kind: "prompting" }
  | { kind: "confirming"; hash?: Hash }
  | { kind: "sent"; hash?: Hash }
  | { kind: "unconfirmed"; hash: Hash }
  | { kind: "failed"; message: string; hash?: Hash }
  | { kind: "rejected" }
  | { kind: "skipped" }
  | { kind: "not-sent" };

export type RunState = {
  mode: "sequential" | "batch";
  items: Holding[];
  statuses: ItemStatus[];
  phase: "running" | "paused" | "done";
  current: number | null;
  pause: { index: number; reason: "rejected" | "failed"; message?: string } | null;
  stopRequested: boolean;
  note: string | null;
};

type Choice = "retry" | "skip" | "stop";

type Wallet = Awaited<ReturnType<typeof getConnectorClient>>;

// Runs a confirmed plan. Every token gets its own wallet prompt, one after another. Rejecting a
// prompt sends nothing and pauses the run so the person decides what happens next; Stop means no
// further prompts open. A single batched prompt is only used when the wallet reported atomic
// batching as "supported" (never "ready", which would mean an account upgrade).
export function useSendRun(config: Config, registry: Registry) {
  const announce = useAnnounce();
  const [state, setState] = useState<RunState | null>(null);
  const ctrl = useRef<{ stop: boolean; skip: Set<number>; decide: ((c: Choice) => void) | null; running: boolean }>({
    stop: false,
    skip: new Set(),
    decide: null,
    running: false,
  });

  const setStatus = useCallback((i: number, st: ItemStatus) => {
    setState((s0) => s0 && { ...s0, statuses: s0.statuses.map((x, j) => (j === i ? st : x)) });
  }, []);

  // If the door unmounts mid-run, no further prompt may open behind the person's back.
  useEffect(() => {
    const c = ctrl.current;
    return () => {
      c.stop = true;
      c.decide?.("stop");
    };
  }, []);

  // Checked before every prompt: the wallet must still be connected with the reviewed account
  // and on Robinhood Chain.
  const stillSameWallet = useCallback(
    (owner: Address) => {
      const now = getConnection(config);
      return now.status === "connected" && sameAddress(now.address, owner) && now.chainId === CHAIN_ID;
    },
    [config],
  );

  const ask = useCallback(
    (index: number, reason: "rejected" | "failed", message?: string) =>
      new Promise<Choice>((resolve) => {
        ctrl.current.decide = (c) => {
          ctrl.current.decide = null;
          resolve(c);
        };
        setState((s0) => s0 && { ...s0, phase: "paused", pause: { index, reason, message } });
      }),
    [],
  );

  const runSequential = useCallback(
    async (wallet: Wallet, calls: PlainTransfer[], items: Holding[], owner: Address) => {
      const n = items.length;
      for (let i = 0; i < n; i++) {
        if (ctrl.current.stop) break;
        if (!stillSameWallet(owner)) {
          setState((s0) => s0 && { ...s0, note: "Your wallet disconnected, changed account or changed network, so the run stopped. Nothing more was sent." });
          break;
        }
        if (ctrl.current.skip.has(i)) {
          setStatus(i, { kind: "skipped" });
          continue;
        }
        const sym = items[i].token.symbol;
        let settled = false;
        while (!settled) {
          setState((s0) => s0 && { ...s0, current: i, phase: "running", pause: null });
          setStatus(i, { kind: "prompting" });
          announce(`Prompt ${i + 1} of ${n}: confirm or reject sending ${sym} in your wallet.`);
          let hash: Hash;
          try {
            hash = await sendTransaction(wallet, {
              account: wallet.account,
              chain: robinhood,
              to: calls[i].to,
              data: calls[i].data,
              value: 0n,
            });
          } catch (e) {
            const rejected = isUserRejection(e);
            const message = rejected ? undefined : shortError(e);
            setStatus(i, rejected ? { kind: "rejected" } : { kind: "failed", message: message! });
            announce(rejected ? `Nothing was sent for ${sym}.` : `${sym} wasn't sent. ${message}`, true);
            const choice = ctrl.current.stop ? "stop" : await ask(i, rejected ? "rejected" : "failed", message);
            if (choice === "retry") continue;
            if (choice === "stop") ctrl.current.stop = true;
            settled = true;
            continue;
          }
          setStatus(i, { kind: "confirming", hash });
          announce(`${sym} was sent to the network. Waiting for confirmation.`);
          try {
            const receipt = await waitForTransactionReceipt(publicClient(), { hash, timeout: 120_000 });
            if (receipt.status === "success") {
              setStatus(i, { kind: "sent", hash });
              announce(`${sym} is confirmed on chain.`);
            } else {
              setStatus(i, {
                kind: "failed",
                hash,
                message: "The transaction failed on chain, so the token stayed in your wallet. The network fee was still paid.",
              });
              announce(`${sym} failed on chain and stayed in your wallet.`, true);
            }
          } catch {
            setStatus(i, { kind: "unconfirmed", hash });
          }
          settled = true;
        }
      }
    },
    [announce, ask, setStatus, stillSameWallet],
  );

  const runBatch = useCallback(
    async (wallet: Wallet, calls: PlainTransfer[], items: Holding[]) => {
      const all = (st: ItemStatus) => setState((s0) => s0 && { ...s0, statuses: items.map(() => st) });
      all({ kind: "prompting" });
      setState((s0) => s0 && { ...s0, current: 0 });
      announce(`One prompt for all ${items.length} tokens: confirm or reject it in your wallet.`);
      try {
        const { id } = await sendCalls(wallet, {
          account: wallet.account,
          chain: robinhood,
          calls: calls.map((c) => ({ to: c.to, data: c.data, value: 0n })),
          forceAtomic: true,
        });
        all({ kind: "confirming" });
        const res = await waitForCallsStatus(wallet, { id, timeout: 180_000 });
        const receipts = res.receipts ?? [];
        if (res.status === "success") {
          setState(
            (s0) =>
              s0 && {
                ...s0,
                statuses: items.map((_, i) => ({ kind: "sent", hash: (receipts[i] ?? receipts[0])?.transactionHash })),
              },
          );
          announce(`All ${items.length} tokens are confirmed on chain.`);
        } else {
          all({ kind: "failed", message: "The batch didn't go through. It was all or nothing, so none of these tokens were sent." });
          announce("The batch didn't go through. Nothing in it was sent.", true);
        }
      } catch (e) {
        if (isUserRejection(e)) {
          all({ kind: "rejected" });
          announce("Nothing was sent.", true);
        } else if (isBatchUnsupported(e)) {
          all({ kind: "not-sent" });
          setState(
            (s0) =>
              s0 && {
                ...s0,
                note: "Your wallet can't send these as one confirmation. Nothing was sent. Go back and send them one by one.",
              },
          );
          announce("Your wallet can't send these as one confirmation. Nothing was sent.", true);
        } else {
          all({ kind: "failed", message: shortError(e) });
          announce(`Nothing was sent. ${shortError(e)}`, true);
        }
      }
    },
    [announce],
  );

  const start = useCallback(
    async (items: Holding[], mode: "sequential" | "batch", owner: Address, vault: Address) => {
      if (ctrl.current.running) return;
      ctrl.current = { stop: false, skip: new Set(), decide: null, running: true };
      setState({
        mode,
        items,
        statuses: items.map(() => ({ kind: "queued" })),
        phase: "running",
        current: null,
        pause: null,
        stopRequested: false,
        note: null,
      });
      try {
        const wallet = await getConnectorClient(config, { chainId: CHAIN_ID });
        if (!sameAddress(wallet.account.address, owner)) {
          throw new Error("The wallet's account changed since the review, so nothing was sent.");
        }
        // Rebuilt and checked here, immediately before any prompt.
        const calls = items.map((h) => buildPlainTransfer(registry, h.token.address, vault, owner, h.raw));
        if (mode === "batch") await runBatch(wallet, calls, items);
        else await runSequential(wallet, calls, items, owner);
      } catch (e) {
        setState((s0) => s0 && { ...s0, note: `Nothing more was sent. ${shortError(e)}` });
      } finally {
        ctrl.current.running = false;
        setState(
          (s0) =>
            s0 && {
              ...s0,
              phase: "done",
              current: null,
              pause: null,
              statuses: s0.statuses.map((st) => (st.kind === "queued" || st.kind === "prompting" ? { kind: "not-sent" } : st)),
            },
        );
      }
    },
    [config, registry, runBatch, runSequential],
  );

  const skip = useCallback(
    (i: number) => {
      if (ctrl.current.skip.has(i)) {
        ctrl.current.skip.delete(i);
        setStatus(i, { kind: "queued" });
      } else {
        ctrl.current.skip.add(i);
        setStatus(i, { kind: "skipped" });
      }
    },
    [setStatus],
  );

  const stop = useCallback(() => {
    ctrl.current.stop = true;
    setState((s0) => s0 && { ...s0, stopRequested: true });
    announce("Stopping. No more wallet prompts will open.");
    ctrl.current.decide?.("stop");
  }, [announce]);

  const decide = useCallback((c: Choice) => ctrl.current.decide?.(c), []);
  const reset = useCallback(() => setState(null), []);

  return { state, start, skip, stop, decide, reset };
}

function statusText(st: ItemStatus): string {
  switch (st.kind) {
    case "queued":
      return "Waiting its turn";
    case "prompting":
      return "Waiting for your wallet";
    case "confirming":
      return "Sent, waiting for confirmation";
    case "sent":
      return "Sent and confirmed";
    case "unconfirmed":
      return "Sent, confirmation is taking longer than usual";
    case "failed":
      return "Not sent";
    case "rejected":
      return "Nothing was sent (you rejected it)";
    case "skipped":
      return "Skipped, nothing was sent";
    case "not-sent":
      return "Not sent";
  }
}

const CHIP: Record<ItemStatus["kind"], string> = {
  queued: "Queued",
  prompting: "In your wallet",
  confirming: "Confirming",
  sent: "Sent",
  unconfirmed: "Sent",
  failed: "Not sent",
  rejected: "Rejected",
  skipped: "Skipped",
  "not-sent": "Not sent",
};

function chipText(st: ItemStatus) {
  return CHIP[st.kind];
}

export function RunView({
  run,
  owner,
  onScanAgain,
}: {
  run: ReturnType<typeof useSendRun>;
  owner: Address;
  onScanAgain: () => void;
}) {
  const st = run.state;
  if (!st) return null;
  const n = st.items.length;
  const sentCount = st.statuses.filter((x) => x.kind === "sent" || x.kind === "unconfirmed").length;
  const done = st.phase === "done";
  const current = st.current;
  const pausedItem = st.pause ? st.items[st.pause.index] : null;

  return (
    <section className={s.section} aria-labelledby="run-heading">
      <StepHeading id="run-heading">{done ? `Sent ${sentCount} of ${n}` : "Sending"}</StepHeading>

      {!done && st.mode === "sequential" && current !== null && st.statuses[current]?.kind === "prompting" && (
        <p className={s.p}>
          <strong>
            Prompt {current + 1} of {n}:
          </strong>{" "}
          confirm or reject sending {st.items[current].token.symbol} in your wallet. Rejecting sends nothing.
        </p>
      )}
      {!done && st.mode === "batch" && (
        <p className={s.p}>One prompt for all {n} tokens. Confirm or reject it in your wallet. Rejecting sends nothing.</p>
      )}

      {st.pause && pausedItem && (
        <div className={`${s.notice} ${s.noticeWarn} ${s.pause}`}>
          <p className={s.p}>
            <strong>
              {st.pause.reason === "rejected"
                ? `Nothing was sent for ${pausedItem.token.symbol}.`
                : `${pausedItem.token.symbol} wasn't sent.`}
            </strong>{" "}
            {st.pause.message}
          </p>
          <div className={s.actions}>
            <button type="button" className={s.btn} onClick={() => run.decide("retry")}>
              Try {pausedItem.token.symbol} again
            </button>
            {st.pause.index < n - 1 && (
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => run.decide("skip")}>
                Skip it and continue
              </button>
            )}
            <button type="button" className={s.btn} onClick={() => run.decide("stop")}>
              {st.pause.index < n - 1 ? "Stop here" : "Finish"}
            </button>
          </div>
        </div>
      )}

      <ol className={s.runList}>
        {st.items.map((h, i) => {
          const x = st.statuses[i];
          const hash = "hash" in x ? x.hash : undefined;
          const canSkip = !done && st.mode === "sequential" && (current === null || i > current) && (x.kind === "queued" || x.kind === "skipped");
          return (
            <li key={h.token.address} className={`${s.runItem} ${i === current && !done ? s.runItemCurrent : ""}`}>
              <div>
                <span className={s.sym}>{h.token.symbol}</span>{" "}
                <span className={s.muted}>
                  {tokenAmount(h.raw, h.token.decimals)} {h.token.symbol}
                </span>
              </div>
              <div>
                {canSkip ? (
                  <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => run.skip(i)}>
                    {x.kind === "skipped" ? "Undo skip" : "Skip"}
                  </button>
                ) : (
                  <span
                    className={`${s.chip} ${x.kind === "sent" ? s.chipGood : ""} ${
                      x.kind === "failed" || x.kind === "rejected" ? s.chipWarn : ""
                    }`}
                  >
                    {chipText(x)}
                  </span>
                )}
              </div>
              <div className={s.runDetail}>
                {statusText(x)}
                {x.kind === "failed" && x.message ? `. ${x.message}` : ""}
                {hash && (
                  <>
                    {" "}
                    <ExternalLink href={explorer.tx(hash)}>View the transaction</ExternalLink>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {!done && (
        <div className={s.actions}>
          <button type="button" className={s.btn} onClick={run.stop} disabled={st.stopRequested || st.mode === "batch"}>
            {st.stopRequested ? "Stopping after this one" : "Stop after this one"}
          </button>
          <p className={`${s.small} ${s.muted}`} style={{ margin: 0, alignSelf: "center" }}>
            A wallet prompt that is already open still needs an answer. Reject it there to send nothing.
          </p>
        </div>
      )}

      {st.note && <p className={s.fieldError}>{st.note}</p>}

      {done && (
        <div className={s.notice}>
          <p className={s.p}>
            {sentCount > 0
              ? `The raffle counts what arrives at the vault, credited to ${shortAddress(owner)}, the address that sent it.`
              : "Nothing was sent. Your tokens are where they were."}
          </p>
          <div className={s.actions}>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={onScanAgain}>
              Scan again
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
