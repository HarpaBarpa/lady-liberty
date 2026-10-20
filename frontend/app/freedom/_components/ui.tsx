"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { explorer } from "../_lib/chain";
import { addressGroups, priceLabel, tokenAmount, usd } from "../_lib/format";
import type { Holding } from "../_lib/scan";
import s from "../freedom.module.css";

// One polite and one assertive live region for the whole page (WCAG 2.2 SC 4.1.3).
// Visible status text does not carry aria-live itself, so nothing is announced twice.

type Announce = (message: string, urgent?: boolean) => void;
const AnnounceContext = createContext<Announce>(() => {});

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState("");
  const [assertive, setAssertive] = useState("");
  const announce = useCallback<Announce>((message, urgent = false) => {
    const set = urgent ? setAssertive : setPolite;
    // Clearing first makes screen readers repeat a message that happens to be identical.
    set("");
    window.setTimeout(() => set(message), 60);
  }, []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div className={s.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div className={s.srOnly} role="alert" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </AnnounceContext.Provider>
  );
}

export function useAnnounce() {
  return useContext(AnnounceContext);
}

// A step heading that takes focus when its step appears, so keyboard and screen reader
// users land on the new content instead of being left behind.
export function StepHeading({
  children,
  focus = true,
  id,
  tag,
}: {
  children: ReactNode;
  focus?: boolean;
  id?: string;
  tag?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) ref.current?.focus({ preventScroll: false });
  }, [focus]);
  return (
    <>
      {tag && <p className={s.levelTag}>{tag}</p>}
      <h2 ref={ref} id={id} tabIndex={-1} className={s.h2}>
        {children}
      </h2>
    </>
  );
}

export function GroupedAddress({ address, label }: { address: string; label?: string }) {
  return (
    <span className={s.addr} aria-label={label ? `${label}: ${address}` : address}>
      {addressGroups(address).map((g, i) => (
        <span key={i} className={s.addrGroup} aria-hidden="true">
          {g}
        </span>
      ))}
    </span>
  );
}

export function CopyButton({
  value,
  label,
  disabled = false,
  small = true,
}: {
  value: string;
  label: string;
  disabled?: boolean;
  small?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const announce = useAnnounce();
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      announce(`Copied ${label.toLowerCase()}.`);
    } catch {
      announce(`Couldn't copy. Select the ${label.toLowerCase()} and copy it by hand.`, true);
    }
  }
  return (
    <button
      type="button"
      className={`${s.btn} ${small ? s.btnSmall : ""}`}
      onClick={copy}
      disabled={disabled}
      aria-label={copied ? `Copied ${label.toLowerCase()}` : `Copy ${label.toLowerCase()}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className={s.srOnly}> (opens in a new tab)</span>
    </a>
  );
}

export function HoldingRow({
  holding,
  checked,
  onToggle,
  disabled,
  reason,
  large,
}: {
  holding: Holding;
  checked?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  reason?: string;
  large?: boolean;
}) {
  const { token, raw, price } = holding;
  const id = `pick-${token.address}`;
  const amount = `${tokenAmount(raw, token.decimals)} ${token.symbol}`;
  return (
    <li className={`${s.row} ${onToggle ? "" : s.rowNoCheck}`}>
      {onToggle && (
        <input
          id={id}
          type="checkbox"
          className={s.check}
          checked={Boolean(checked)}
          onChange={onToggle}
          disabled={disabled && !checked}
          aria-describedby={`${id}-meta`}
        />
      )}
      <div className={s.rowMain}>
        <div className={s.rowTitle}>
          {onToggle ? (
            <label htmlFor={id} className={s.sym}>
              {token.symbol}
            </label>
          ) : (
            <span className={s.sym}>{token.symbol}</span>
          )}
          <span className={s.name}>{token.name}</span>
          {large && <span className={s.largeTag}>Larger holding</span>}
        </div>
        <div className={s.rowMeta} id={`${id}-meta`}>
          <span className={s.metaItem}>{amount}</span>
          <span className={s.metaItem}>
            <ExternalLink href={explorer.token(token.address)}>Token contract</ExternalLink>
          </span>
        </div>
        {reason && <div className={s.reason}>{reason}</div>}
      </div>
      <div className={s.rowValue}>
        <span className={s.value}>{usd(holding.usd)}</span>
      </div>
      <span className={`${s.priceNote} ${price.state === "fresh" ? "" : s.priceOld}`}>{priceLabel(price)}</span>
    </li>
  );
}
