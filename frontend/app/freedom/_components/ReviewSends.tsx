"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { explorer, publicClient } from "../_lib/chain";
import { CHAIN_ID, CHAIN_NAME, VAULT } from "../_lib/config";
import { eth, fullTokenAmount, usd, usdPrecise } from "../_lib/format";
import { feeUsdPerSend, feeWeiPerSend, recheckHoldings, transferData, type Holding, type Scan } from "../_lib/scan";
import { TRANSFER_SELECTOR } from "../_lib/send";
import s from "../freedom.module.css";
import { ExternalLink, GroupedAddress, StepHeading, useAnnounce } from "./ui";

type Props = {
  owner: Address;
  picked: Holding[];
  scan: Scan;
  chainOk: boolean;
  switching: boolean;
  onSwitch: () => void;
  checkAtomic: () => Promise<boolean>;
  onBack: () => void;
  onStart: (mode: "sequential" | "batch", items: Holding[]) => void;
};

// The review screen is where WCAG 2.2 SC 3.3.4 is met: sends on a blockchain can't be reversed,
// so everything is checked again and shown in full before the one button that starts them.
export default function ReviewSends({ owner, picked, scan, chainOk, switching, onSwitch, checkAtomic, onBack, onStart }: Props) {
  const announce = useAnnounce();
  const [phase, setPhase] = useState<"checking" | "ready" | "error">("checking");
  const [ready, setReady] = useState<Holding[]>([]);
  const [dropped, setDropped] = useState<{ h: Holding; why: string }[]>([]);
  const [rawOpen, setRawOpen] = useState<Record<string, boolean>>({});
  const [atomic, setAtomic] = useState(false);
  const vault = VAULT.status === "set" ? VAULT.address : null;

  useEffect(() => {
    let live = true;
    announce("Checking the chosen balances again before review.");
    recheckHoldings(publicClient(), owner, picked)
      .then((res) => {
        if (!live) return;
        const ok = res.filter((h) => h.preflight.ok);
        const bad = res.filter((h) => !h.preflight.ok).map((h) => ({ h, why: h.preflight.ok ? "" : h.preflight.reason }));
        setReady(ok);
        setDropped(bad);
        setPhase("ready");
        announce(
          bad.length
            ? `${ok.length} ready to review. ${bad.length} dropped because they can't be sent right now.`
            : `${ok.length} ready to review.`,
        );
      })
      .catch(() => {
        if (!live) return;
        setPhase("error");
        announce("Couldn't check the balances again. Nothing was sent.", true);
      });
    return () => {
      live = false;
    };
  }, [owner, picked, announce]);

  useEffect(() => {
    let live = true;
    if (!chainOk) return;
    // wallet_getCapabilities is a read; it never opens a prompt. Only "supported" counts.
    checkAtomic()
      .then((ok) => live && setAtomic(ok))
      .catch(() => live && setAtomic(false));
    return () => {
      live = false;
    };
  }, [chainOk, checkAtomic]);

  const n = ready.length;
  const totalUsd = ready.reduce((sum, h) => sum + (h.usd ?? 0), 0);
  const estimate = ready.some((h) => h.price.state !== "fresh");
  const perWei = feeWeiPerSend(scan);
  const perUsd = feeUsdPerSend(scan);
  const totalWei = perWei === null ? null : perWei * BigInt(n);
  const totalFeeUsd = perUsd === null ? null : perUsd * n;
  const canSend = Boolean(vault) && chainOk && n > 0 && phase === "ready";
  const oneConfirmation = canSend && chainOk && atomic && n > 1;

  return (
    <section className={s.section} aria-labelledby="review-heading">
      <StepHeading id="review-heading">Review before anything is sent</StepHeading>
      <p className={s.p}>Check every line. Nothing leaves your wallet until you press send here and then confirm in your wallet.</p>

      {phase === "checking" && (
        <p className={s.progress}>
          <span className={s.flame} aria-hidden="true" />
          Checking the chosen balances again.
        </p>
      )}
      {phase === "error" && (
        <div className={`${s.notice} ${s.noticeWarn}`}>
          <p className={s.p}>Couldn&apos;t check the balances again, so nothing can be sent yet. Go back and scan again.</p>
        </div>
      )}

      {phase === "ready" && (
        <div className={s.manifest}>
          <span className={s.stamp} aria-hidden="true">
            Nothing sent yet
          </span>
          <h3 className={s.manifestTitle}>
            {n} send{n === 1 ? "" : "s"} to the raffle vault
          </h3>
          <p className={s.srOnly}>Status: nothing has been sent yet.</p>

          <dl className={s.facts}>
            <dt>Network</dt>
            <dd>
              {CHAIN_NAME} (ID {CHAIN_ID})
            </dd>
            <dt>From</dt>
            <dd>
              <GroupedAddress address={owner} label="From, your connected address" />
            </dd>
            <dt>To</dt>
            <dd>
              {vault ? (
                <>
                  <GroupedAddress address={vault} label="To, the raffle vault" />{" "}
                  <ExternalLink href={explorer.address(vault)}>Explorer</ExternalLink>
                </>
              ) : (
                <strong>Raffle vault, not deployed yet</strong>
              )}
            </dd>
          </dl>

          {dropped.length > 0 && (
            <div className={s.dropped}>
              <strong>Dropped from this plan</strong>
              <ul className={s.inlineList}>
                {dropped.map(({ h, why }) => (
                  <li key={h.token.address}>
                    {h.token.symbol}: {why}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ol className={s.manifestItems}>
            {ready.map((h, i) => {
              const key = h.token.address;
              const data = vault ? transferData(vault, h.raw) : null;
              return (
                <li key={key} className={s.manifestItem}>
                  <span className={s.manifestItemHead}>
                    <span className={s.itemNo} aria-hidden="true">
                      {i + 1}.
                    </span>
                    <span className={s.sym}>{h.token.symbol}</span>
                    <span className={s.name}>{h.token.name}</span>
                  </span>
                  <div className={s.manifestRow}>
                    <span>
                      {fullTokenAmount(h.raw, h.token.decimals)} {h.token.symbol}
                    </span>
                    <strong>
                      {h.price.state === "fresh" ? "" : "about "}
                      {usd(h.usd)}
                    </strong>
                  </div>
                  <div className={`${s.small} ${s.muted}`} style={{ marginTop: 4 }}>
                    Token contract <span className={s.mono}>{h.token.address}</span>{" "}
                    <ExternalLink href={explorer.token(h.token.address)}>Explorer</ExternalLink>
                  </div>
                  <div className={s.call}>
                    transfer(to: {vault ?? "vault, not deployed yet"}, amount: {h.raw.toString()})
                  </div>
                  <div className={`${s.small} ${s.muted}`} style={{ marginTop: 4 }}>
                    A plain token transfer, function {TRANSFER_SELECTOR}. No ETH attached.{" "}
                    <button
                      type="button"
                      className={s.linkBtn}
                      aria-expanded={Boolean(rawOpen[key])}
                      onClick={() => setRawOpen((r) => ({ ...r, [key]: !r[key] }))}
                    >
                      {rawOpen[key] ? "Hide raw data" : "Show raw data"}
                    </button>
                  </div>
                  {rawOpen[key] && (
                    <div className={s.rawData}>{data ?? "The raw call data appears here once the vault address is set."}</div>
                  )}
                </li>
              );
            })}
          </ol>

          <div className={s.perforation} aria-hidden="true" />

          <div className={s.totals}>
            <div className={s.totalRow}>
              <span>Total</span>
              <strong>
                {n} token{n === 1 ? "" : "s"}, {estimate ? "about " : ""}
                {usd(totalUsd)}
              </strong>
            </div>
            <div className={s.totalRow}>
              <span>Network fee, paid by your wallet in ETH</span>
              <strong>
                about {eth(totalWei)}
                {totalFeeUsd !== null ? ` (${usdPrecise(totalFeeUsd)})` : ""}
              </strong>
            </div>
            {estimate && (
              <p className={`${s.small} ${s.muted}`} style={{ margin: 0 }}>
                Some prices are last known rather than live, so the total is an estimate.
              </p>
            )}
          </div>

          <p className={s.irreversible}>Sent tokens can&apos;t be returned.</p>
          <p className={`${s.p} ${s.small}`}>
            This app never asks for approvals, permits or signatures. Each send is a plain token transfer that you confirm
            in your wallet, one prompt per token. Rejecting a prompt sends nothing.
          </p>

          <div className={s.actions}>
            {vault && !chainOk ? (
              <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={onSwitch} disabled={switching}>
                {switching ? "Waiting for your wallet" : "Switch to Robinhood Chain"}
              </button>
            ) : (
              <button
                type="button"
                className={`${s.btn} ${s.btnPrimary}`}
                disabled={!canSend}
                onClick={() => onStart("sequential", ready)}
              >
                Send {n} token{n === 1 ? "" : "s"}, confirm each in your wallet
              </button>
            )}
            {oneConfirmation && (
              <button type="button" className={s.btn} onClick={() => onStart("batch", ready)}>
                Send in one confirmation
              </button>
            )}
            <button type="button" className={s.btn} onClick={onBack}>
              Back to the list
            </button>
          </div>
          {!vault && (
            <p className={s.disabledReason}>
              Vault not deployed yet. Sending is off until the vault exists and its address is published on this page.
            </p>
          )}
          {vault && !chainOk && (
            <p className={`${s.small} ${s.muted}`} style={{ marginTop: 8 }}>
              Your wallet is on another network. Switching asks your wallet first.
            </p>
          )}
          {oneConfirmation && (
            <p className={`${s.small} ${s.muted}`} style={{ marginTop: 8 }}>
              Your wallet reports it can send all {n} in one confirmation. If one fails, none are sent.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
