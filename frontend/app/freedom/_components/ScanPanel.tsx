"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { publicClient } from "../_lib/chain";
import { DEFAULT_SMALL_USD, PLAN_CAP, RPC_LABEL } from "../_lib/config";
import { eth, usd, usdPrecise, when } from "../_lib/format";
import { hasChainlinkFeed } from "../_lib/prices";
import type { Registry } from "../_lib/registry";
import { feeUsdPerSend, feeWeiPerSend, groupHoldings, scanAddress, type Holding, type Scan } from "../_lib/scan";
import s from "../freedom.module.css";
import { HoldingRow, StepHeading, useAnnounce } from "./ui";

type Props = {
  registry: Registry;
  address: Address;
  continueLabel: string;
  onContinue: (picked: Holding[], scan: Scan) => void;
  initialPicked?: string[];
};

export default function ScanPanel({ registry, address, continueLabel, onContinue, initialPicked }: Props) {
  const announce = useAnnounce();
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<"scanning" | "done" | "error">("scanning");
  const [progress, setProgress] = useState("Starting the scan.");
  const [scan, setScan] = useState<Scan | null>(null);
  const [ceilingInput, setCeilingInput] = useState(String(DEFAULT_SMALL_USD));
  const [picked, setPicked] = useState<Set<string>>(() => new Set(initialPicked ?? []));
  const [capNote, setCapNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    scanAddress(publicClient(), registry, address, (m) => {
      if (!live) return;
      setProgress(m);
      announce(m);
    })
      .then((result) => {
        if (!live) return;
        setScan(result);
        setPhase("done");
        const n = result.holdings.length;
        announce(
          n
            ? `Scan finished. ${n} Robinhood Stock Token${n === 1 ? "" : "s"} with a balance.`
            : "Scan finished. No Robinhood Stock Tokens in this address.",
        );
      })
      .catch(() => {
        if (!live) return;
        setPhase("error");
        announce("The scan didn't finish because the network didn't answer. Try again.", true);
      });
    return () => {
      live = false;
    };
  }, [registry, address, run, announce]);

  function rescan() {
    setPhase("scanning");
    setScan(null);
    setRun((r) => r + 1);
  }

  const ceiling = Math.max(0.01, Number(ceilingInput) || DEFAULT_SMALL_USD);
  const groups = useMemo(() => (scan ? groupHoldings(scan, ceiling) : null), [scan, ceiling]);

  // Anything that drops into "Not counted right now" leaves the selection.
  const selectable = useMemo(() => {
    const m = new Map<string, Holding>();
    groups?.small.forEach((h) => m.set(h.token.address, h));
    groups?.large.forEach((h) => m.set(h.token.address, h));
    return m;
  }, [groups]);
  const chosen = [...picked].map((a) => selectable.get(a)).filter((h): h is Holding => Boolean(h));
  const atCap = chosen.length >= PLAN_CAP;
  const chosenUsd = chosen.reduce((sum, h) => sum + (h.usd ?? 0), 0);
  const anyEstimate = chosen.some((h) => h.price.state !== "fresh");

  function toggle(h: Holding) {
    setCapNote(null);
    setPicked((prev) => {
      const next = new Set([...prev].filter((a) => selectable.has(a)));
      if (next.has(h.token.address)) next.delete(h.token.address);
      else if (next.size < PLAN_CAP) next.add(h.token.address);
      return next;
    });
  }

  function selectAllSmall() {
    if (!groups) return;
    const take = groups.small.slice(0, PLAN_CAP);
    setPicked(new Set(take.map((h) => h.token.address)));
    const note =
      groups.small.length > PLAN_CAP
        ? `Selected the ${PLAN_CAP} most valuable of ${groups.small.length} small balances. A plan holds up to ${PLAN_CAP}; send these, then scan again for the rest.`
        : `Selected all ${take.length} small balance${take.length === 1 ? "" : "s"}.`;
    setCapNote(note);
    announce(note);
  }

  function clearAll() {
    setPicked(new Set());
    setCapNote(null);
    announce("Selection cleared. Nothing is selected.");
  }

  const feeWei = scan ? feeWeiPerSend(scan) : null;
  const feeUsd = scan ? feeUsdPerSend(scan) : null;
  const feedCount = scan ? scan.holdings.filter((h) => hasChainlinkFeed(h.token.address)).length : 0;

  return (
    <section className={s.section} aria-labelledby="scan-heading">
      <StepHeading id="scan-heading" tag="Step 3 · The scan">What this address holds</StepHeading>

      {phase === "scanning" && (
        <p className={s.progress}>
          <span className={s.flame} aria-hidden="true" />
          {progress}
        </p>
      )}

      {phase === "error" && (
        <div className={`${s.notice} ${s.noticeWarn}`}>
          <p className={s.p}>
            <strong>The scan didn&apos;t finish.</strong> The network didn&apos;t answer in time. Nothing was sent or
            changed.
          </p>
          <button type="button" className={s.btn} onClick={rescan}>
            Scan again
          </button>
        </div>
      )}

      {phase === "done" && scan && groups && (
        <>
          <p className={s.p}>
            Checked {scan.tokensChecked} Robinhood Stock Tokens at {when(scan.checkedAt)}.{" "}
            {scan.holdings.length === 0
              ? "This address holds none of them."
              : `${scan.holdings.length} ${scan.holdings.length === 1 ? "has" : "have"} a balance.`}
          </p>

          <details className={s.details}>
            <summary>How this was checked</summary>
            <dl>
              <dt>Token list</dt>
              <dd>
                {scan.registrySource === "live"
                  ? "Robinhood's live Stock Token registry."
                  : `Built-in copy of Robinhood's Stock Token registry from ${scan.registryAsOf}. The live list can't be read from this page yet.`}{" "}
                Only contracts on this list are ever read or offered. Look-alike tokens are ignored.
              </dd>
              <dt>Balances</dt>
              <dd>One Multicall3 read through the {RPC_LABEL}. No wallet and no signature involved.</dd>
              <dt>Prices</dt>
              <dd>
                Chainlink feeds on Robinhood Chain where one exists ({feedCount} of the tokens found), otherwise
                Robinhood&apos;s quote for the share times the token&apos;s multiplier
                {scan.liveQuotes ? "." : ", from a saved copy because the live quote can't be read from this page."}
              </dd>
              <dt>Test sends</dt>
              <dd>
                Every token was test-sent with eth_call from this address{" "}
                {scan.preflightTo === "vault" ? "to the vault" : "to itself, because the vault doesn't exist yet"}.
                Nothing was sent. A token that fails is listed under &quot;Not counted right now&quot;.
              </dd>
              <dt>Fee per send</dt>
              <dd>
                About {eth(feeWei)}
                {feeUsd !== null ? ` (${usdPrecise(feeUsd)})` : ""}, paid in ETH by the wallet that sends.
              </dd>
            </dl>
          </details>

          {scan.balanceReadFailures > 0 && (
            <p className={s.fieldNote}>
              {scan.balanceReadFailures} balance{scan.balanceReadFailures === 1 ? "" : "s"} couldn&apos;t be read.{" "}
              <button type="button" className={s.linkBtn} onClick={rescan}>
                Scan again
              </button>
            </p>
          )}

          {scan.holdings.length > 0 && (
            <div className={s.ceiling}>
              <label htmlFor="ceiling">Small means worth under $</label>
              <input
                id="ceiling"
                className={s.inputNumber}
                type="number"
                inputMode="decimal"
                min="0.01"
                step="1"
                value={ceilingInput}
                onChange={(e) => setCeilingInput(e.target.value)}
                aria-describedby="ceiling-note"
              />
              <span id="ceiling-note" className={`${s.muted} ${s.small}`}>
                A house rule, not a standard. Change it if you like.
              </span>
            </div>
          )}

          {scan.holdings.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <h3 className={s.h3}>Small balances that count ({groups.small.length})</h3>
                {groups.small.length > 0 && (
                  <div className={s.actions} style={{ marginTop: 0 }}>
                    <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={selectAllSmall}>
                      Select all small balances
                    </button>
                    {chosen.length > 0 && (
                      <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={clearAll}>
                        Clear selection
                      </button>
                    )}
                  </div>
                )}
              </div>
              {groups.small.length === 0 ? (
                <p className={s.groupNote}>None under {usd(ceiling)} that can be sent right now.</p>
              ) : (
                <>
                  <p className={s.groupNote}>Nothing is ticked for you. Pick the ones you want to send.</p>
                  <ul className={s.rows}>
                    {groups.small.map((h) => (
                      <HoldingRow
                        key={h.token.address}
                        holding={h}
                        checked={picked.has(h.token.address)}
                        onToggle={() => toggle(h)}
                        disabled={atCap}
                      />
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          {groups.large.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <h3 className={s.h3}>Larger holdings ({groups.large.length})</h3>
              </div>
              <p className={s.groupNote}>
                Worth {usd(ceiling)} or more. These are never selected for you. Tick one only if you mean to give a real
                position to the raffle.
              </p>
              <ul className={s.rows}>
                {groups.large.map((h) => (
                  <HoldingRow
                    key={h.token.address}
                    holding={h}
                    checked={picked.has(h.token.address)}
                    onToggle={() => toggle(h)}
                    disabled={atCap}
                    large
                  />
                ))}
              </ul>
            </div>
          )}

          {groups.notCounted.length > 0 && (
            <div className={s.group}>
              <div className={s.groupHead}>
                <h3 className={s.h3}>Not counted right now ({groups.notCounted.length})</h3>
              </div>
              <p className={s.groupNote}>These can&apos;t go into a plan. Each one says why.</p>
              <ul className={s.rows}>
                {groups.notCounted.map((h) => (
                  <HoldingRow key={h.token.address} holding={h} reason={h.why} />
                ))}
              </ul>
            </div>
          )}

          {scan.holdings.length > 0 && (
            <div className={s.selectBar}>
              <div>
                <div className={s.selectCount}>
                  {chosen.length === 0
                    ? "Nothing selected"
                    : `${chosen.length} selected, ${anyEstimate ? "about " : ""}${usd(chosenUsd)}`}
                </div>
                <div className={`${s.small} ${s.muted}`}>
                  {capNote ?? (atCap ? `A plan holds up to ${PLAN_CAP} tokens.` : `Up to ${PLAN_CAP} per plan.`)}
                </div>
              </div>
              <button
                type="button"
                className={`${s.btn} ${s.btnPrimary}`}
                disabled={chosen.length === 0}
                onClick={() => onContinue(chosen, scan)}
              >
                {continueLabel}
              </button>
            </div>
          )}

          {scan.holdings.length === 0 && (
            <p className={s.fieldNote}>
              Stock Tokens sent to this address later will show up when you check again.
            </p>
          )}
        </>
      )}
    </section>
  );
}
