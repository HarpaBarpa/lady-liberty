"use client";

import { useState } from "react";
import type { Address, Hash } from "viem";
import { checkTransaction, findRecentSends, type Arrival } from "../_lib/arrivals";
import { explorer, publicClient } from "../_lib/chain";
import { CHAIN_ID, CHAIN_NAME, VAULT } from "../_lib/config";
import { fullTokenAmount, shortAddress, tokenAmount, usd } from "../_lib/format";
import { eip681Transfer, metamaskTransfer } from "../_lib/links";
import type { Registry } from "../_lib/registry";
import type { Holding } from "../_lib/scan";
import s from "../freedom.module.css";
import QrCode from "./QrCode";
import { CopyButton, ExternalLink, GroupedAddress, StepHeading, useAnnounce } from "./ui";
import VaultBlock from "./VaultBlock";

type SendStatus =
  | { kind: "waiting" }
  | { kind: "checking" }
  | { kind: "seen"; arrivals: Arrival[] }
  | { kind: "not-seen" }
  | { kind: "error" };

type Props = {
  registry: Registry;
  address: Address;
  items: Holding[];
  onBack: () => void;
  onConnectInstead: () => void;
};

export default function NoConnectPlan({ registry, address, items, onBack, onConnectInstead }: Props) {
  const announce = useAnnounce();
  const [index, setIndex] = useState(0);
  const [qrOpen, setQrOpen] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Record<string, SendStatus>>({});
  const vault = VAULT.status === "set" ? VAULT.address : null;
  const h = items[index];
  const n = items.length;

  function go(i: number) {
    setIndex(i);
    announce(`Token ${i + 1} of ${n}: ${items[i].token.symbol}.`);
  }

  async function checkSend(item: Holding) {
    if (!vault) return;
    const key = item.token.address;
    setStatus((st) => ({ ...st, [key]: { kind: "checking" } }));
    try {
      const found = await findRecentSends(publicClient(), item.token, address, vault);
      setStatus((st) => ({ ...st, [key]: found.length ? { kind: "seen", arrivals: found } : { kind: "not-seen" } }));
      announce(
        found.length
          ? `${item.token.symbol}: seen on chain, sent from your address to the vault.`
          : `${item.token.symbol}: no send from your address to the vault yet.`,
      );
    } catch {
      setStatus((st) => ({ ...st, [key]: { kind: "error" } }));
      announce("Couldn't check right now. Try again in a moment.", true);
    }
  }

  const st = status[h.token.address] ?? { kind: "waiting" };
  const eip681 = vault ? eip681Transfer(h.token.address, vault, h.raw) : null;
  const mmLink = vault ? metamaskTransfer(h.token.address, vault, h.raw) : null;

  return (
    <section className={s.section} aria-labelledby="plan-heading">
      <StepHeading id="plan-heading" tag="Step 4 · Send from your wallet">Send from your own wallet</StepHeading>
      <p className={s.p}>
        A link or QR code can only carry one token, so this plan has {n} short step{n === 1 ? "" : "s"}: one send per
        token, each approved in your own wallet app.
      </p>

      <div className={`${s.notice} ${s.noticeWarn}`}>
        <span className={s.noticeTitle}>Send from {shortAddress(address)}, the address you checked</span>
        <p className={s.p}>
          Entries and any prize belong to the address the tokens come from. <strong>Don&apos;t send from an exchange or a
          custodial app.</strong> Their tokens arrive from their own address, not yours, so they can&apos;t be counted for
          you, and anything won would go back to them.
        </p>
        <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={onConnectInstead}>
          Connect instead to prove the sender
        </button>
      </div>

      <VaultBlock />

      <nav aria-label="Tokens in this plan">
        <ol className={s.stepList}>
          {items.map((it, i) => (
            <li key={it.token.address}>
              <button
                type="button"
                className={s.stepPill}
                aria-current={i === index ? "step" : undefined}
                onClick={() => go(i)}
              >
                {i + 1}. {it.token.symbol}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <article className={s.card} aria-labelledby="card-heading">
        <div className={s.cardHead}>
          <h3 id="card-heading" className={s.h3}>
            Token {index + 1} of {n}: {h.token.symbol}
          </h3>
          <span className={`${s.muted} ${s.small}`}>{h.token.name}</span>
        </div>
        <p className={s.cardAmount}>
          {tokenAmount(h.raw, h.token.decimals)} {h.token.symbol}{" "}
          <span className={s.muted} style={{ fontWeight: 400, fontSize: "1rem" }}>
            {h.price.state === "fresh" ? "" : "about "}
            {usd(h.usd)}
          </span>
        </p>
        <p className={`${s.small} ${s.muted}`} style={{ margin: "4px 0 0" }}>
          From {shortAddress(address)} only. Never from an exchange.
        </p>

        <div className={s.tier}>
          <p className={s.tierTitle}>Open in MetaMask</p>
          <p className={`${s.p} ${s.small} ${s.muted}`}>
            On a phone with MetaMask: opens its send screen on {CHAIN_NAME} with these details filled in. You still confirm
            in MetaMask.
          </p>
          {mmLink ? (
            <a className={`${s.btn} ${s.btnPrimary}`} href={mmLink} rel="noopener noreferrer">
              Open in MetaMask
            </a>
          ) : (
            <button type="button" className={s.btn} disabled>
              Open in MetaMask (vault not deployed yet)
            </button>
          )}
        </div>

        <div className={s.tier}>
          <p className={s.tierTitle}>Scan a QR code</p>
          <p className={`${s.p} ${s.small} ${s.muted}`}>
            For moving from a computer to your phone&apos;s wallet. Not every wallet reads these; if yours doesn&apos;t, use the
            details below.
          </p>
          <button
            type="button"
            className={`${s.btn} ${s.btnSmall}`}
            aria-expanded={Boolean(qrOpen[h.token.address])}
            aria-controls="qr-area"
            onClick={() => setQrOpen((q) => ({ ...q, [h.token.address]: !q[h.token.address] }))}
          >
            {qrOpen[h.token.address] ? "Hide QR code" : "Show QR code"}
          </button>
          {qrOpen[h.token.address] && (
            <div id="qr-area" className={s.qrWrap}>
              {eip681 ? (
                <>
                  <QrCode
                    value={eip681}
                    label={`QR code: send ${tokenAmount(h.raw, h.token.decimals)} ${h.token.symbol} to the raffle vault on ${CHAIN_NAME}`}
                  />
                  <p className={`${s.small} ${s.mono}`} style={{ flex: "1 1 220px", margin: 0 }}>
                    {eip681}
                  </p>
                </>
              ) : (
                <div className={s.qrPlaceholder}>The QR code appears here once the vault is deployed.</div>
              )}
            </div>
          )}
        </div>

        <div className={s.tier}>
          <p className={s.tierTitle}>Copy the details</p>
          <p className={`${s.p} ${s.small} ${s.muted}`}>
            In your wallet, choose Send, pick the token by its contract address, paste the vault address and the amount.
          </p>
          <div className={s.fields}>
            <Field label="Network" value={`${CHAIN_NAME}, ID ${CHAIN_ID}`} copyLabel="Network" />
            <Field
              label="Send to (raffle vault)"
              value={vault ?? "Vault not deployed yet"}
              copyLabel="Vault address"
              address={vault ?? undefined}
              disabled={!vault}
            />
            <Field label={`Token contract (${h.token.symbol})`} value={h.token.address} copyLabel="Token contract" address={h.token.address} />
            <Field label="Amount" value={fullTokenAmount(h.raw, h.token.decimals)} copyLabel="Amount" mono />
            <Field label="Amount in raw units (for advanced wallets)" value={h.raw.toString()} copyLabel="Raw amount" mono />
          </div>
          <p className={`${s.small} ${s.muted}`} style={{ marginTop: 10 }}>
            Your wallet may let you change the amount. Whatever arrives at the vault is what counts.
          </p>
        </div>

        <div className={s.statusLine}>
          <StatusChip st={st} hasVault={Boolean(vault)} />
          <button
            type="button"
            className={`${s.btn} ${s.btnSmall}`}
            disabled={!vault || st.kind === "checking"}
            onClick={() => checkSend(h)}
          >
            Check for my send
          </button>
        </div>
        {st.kind === "seen" && (
          <ul className={s.inlineList}>
            {st.arrivals.map((a) => (
              <li key={a.hash}>
                {tokenAmount(a.amount, a.token.decimals)} {a.token.symbol} arrived.{" "}
                <ExternalLink href={explorer.tx(a.hash)}>View the transaction</ExternalLink>
              </li>
            ))}
          </ul>
        )}

        <div className={s.pager}>
          <button type="button" className={s.btn} disabled={index === 0} onClick={() => go(index - 1)}>
            Previous token
          </button>
          <button type="button" className={s.btn} disabled={index === n - 1} onClick={() => go(index + 1)}>
            Next token
          </button>
        </div>
      </article>

      <TxChecker registry={registry} address={address} vault={vault} />

      <div className={s.actions} style={{ marginTop: 28 }}>
        <button type="button" className={s.btn} onClick={onBack}>
          Back to the list
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  copyLabel,
  address,
  mono,
  disabled,
}: {
  label: string;
  value: string;
  copyLabel: string;
  address?: string;
  mono?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={s.field}>
      <span className={s.fieldLabel}>{label}</span>
      <span className={`${s.fieldValue} ${mono ? s.mono : ""}`}>
        {address ? <GroupedAddress address={address} label={label} /> : value}
      </span>
      <CopyButton value={value} label={copyLabel} disabled={disabled} />
    </div>
  );
}

function StatusChip({ st, hasVault }: { st: SendStatus; hasVault: boolean }) {
  if (!hasVault) return <span className={s.chip}>Status checks start when the vault is live</span>;
  if (st.kind === "checking") return <span className={s.chip}>Checking the chain</span>;
  if (st.kind === "seen") return <span className={`${s.chip} ${s.chipGood}`}>Seen on chain</span>;
  if (st.kind === "not-seen") return <span className={s.chip}>Not seen yet</span>;
  if (st.kind === "error") return <span className={`${s.chip} ${s.chipWarn}`}>Couldn&apos;t check</span>;
  return <span className={s.chip}>Waiting for your send</span>;
}

function TxChecker({ registry, address, vault }: { registry: Registry; address: Address; vault: Address | null }) {
  const announce = useAnnounce();
  const [hash, setHash] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!vault) return;
    const h = hash.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(h)) {
      setResult("A transaction hash is 0x followed by 64 characters.");
      return;
    }
    setBusy(true);
    try {
      const r = await checkTransaction(publicClient(), registry, h as Hash, address, vault);
      let msg: string;
      if (r.status === "reverted") msg = "That transaction failed on chain, so nothing in it was sent.";
      else if (r.arrivals.length)
        msg = `Found ${r.arrivals.map((a) => `${tokenAmount(a.amount, a.token.decimals)} ${a.token.symbol}`).join(", ")} sent from your address to the vault.`;
      else if (r.otherSender)
        msg = "That transaction sent Stock Tokens to the vault, but from a different address than the one you checked.";
      else msg = "That transaction didn't send any Robinhood Stock Token to the vault.";
      setResult(msg);
      announce(msg);
    } catch {
      const msg = "No transaction with that hash was found on Robinhood Chain yet.";
      setResult(msg);
      announce(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={s.notice} onSubmit={check} style={{ marginTop: 24 }}>
      <label className={s.label} htmlFor="tx-hash">
        Check a transaction hash
      </label>
      <p className={`${s.p} ${s.small} ${s.muted}`}>Paste the hash your wallet shows after a send to see what reached the vault.</p>
      <div className={s.inputRow}>
        <input
          id="tx-hash"
          className={s.input}
          value={hash}
          onChange={(e) => setHash(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="off"
          placeholder="0x..."
          disabled={!vault}
        />
        <button type="submit" className={s.btn} disabled={!vault || busy}>
          Check transaction
        </button>
      </div>
      {!vault && <p className={s.fieldNote}>Available once the vault is deployed.</p>}
      {result && <p className={s.fieldNote}>{result}</p>}
    </form>
  );
}
