"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { explorer } from "../_lib/chain";
import { VAULT } from "../_lib/config";
import { loadRegistry, type Registry } from "../_lib/registry";
import s from "../freedom.module.css";
import CheckDoor from "./CheckDoor";
import { AnnouncerProvider, ExternalLink, GroupedAddress } from "./ui";

// The wallet library only loads when someone chooses the connected door.
const ConnectDoor = dynamic(() => import("./ConnectDoor"), {
  ssr: false,
  loading: () => (
    <section className={s.section}>
      <p className={s.progress}>
        <span className={s.flame} aria-hidden="true" />
        Loading the wallet connector.
      </p>
    </section>
  ),
});

type Door = "check" | "connect";

export default function FreedomApp() {
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [door, setDoor] = useState<Door | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    loadRegistry().then((r) => live && setRegistry(r));
    return () => {
      live = false;
    };
  }, []);

  const onBusyChange = useCallback((b: boolean) => setBusy(b), []);

  return (
    <AnnouncerProvider>
      <div className={s.page}>
        <header className={s.nav}>
          <div className={s.navInner}>
            <Link href="/" className={s.brand}>
              <Mark />
              <span className={s.brandName}>Lady Liberty</span>
            </Link>
            <Link href="/" className={s.navLink}>
              Main site
            </Link>
          </div>
        </header>

        <main className={s.main} id="main">
          <section className={s.hero} aria-labelledby="page-title">
            <p className={s.kicker}>Lady Liberty raffle</p>
            <h1 id="page-title" className={s.title}>
              The freedom
              <br />
              machine
            </h1>
            <p className={s.lede}>
              It finds the small Robinhood Stock Token balances in a wallet and helps you send the ones you pick to the
              raffle vault. Every send is a plain token transfer that you approve yourself. Nothing is ever sent for you.
            </p>

            <div className={s.doors} role="group" aria-label="Choose how to start">
              <button
                type="button"
                className={s.door}
                aria-pressed={door === "check"}
                onClick={() => setDoor("check")}
                disabled={busy}
              >
                <span className={s.doorTitle}>Check an address</span>
                <span className={s.doorText}>
                  Paste any address to see what it holds, then send from your own wallet app with a link, a QR code or
                  copied details.
                </span>
                <span className={s.doorNote}>Read-only. No wallet connection.</span>
              </button>
              <button
                type="button"
                className={s.door}
                aria-pressed={door === "connect"}
                onClick={() => setDoor("connect")}
                disabled={busy}
              >
                <span className={s.doorTitle}>Connect a wallet</span>
                <span className={s.doorText}>
                  See your own balances and send them here, one wallet confirmation per token.
                </span>
                <span className={s.doorNote}>Shares your address only. You approve every send.</span>
              </button>
            </div>
            {busy && (
              <p className={s.fieldNote}>Finish or stop the current send before switching.</p>
            )}

            <div className={s.vaultStrip}>
              {VAULT.status === "set" ? (
                <>
                  Raffle vault: <GroupedAddress address={VAULT.address} label="Raffle vault" />{" "}
                  <ExternalLink href={explorer.address(VAULT.address)}>Explorer</ExternalLink>
                </>
              ) : (
                <>
                  <strong>Prototype. The raffle vault isn&apos;t deployed yet</strong>, so every send button is switched
                  off. You can still check any address and walk through each step.
                </>
              )}
            </div>
          </section>

          {door && !registry && (
            <section className={s.section}>
              <p className={s.progress}>
                <span className={s.flame} aria-hidden="true" />
                Loading Robinhood&apos;s Stock Token list.
              </p>
            </section>
          )}

          {door === "check" && registry && <CheckDoor registry={registry} onConnectInstead={() => setDoor("connect")} />}
          {door === "connect" && registry && (
            <ConnectDoor registry={registry} onCheckInstead={() => setDoor("check")} onBusyChange={onBusyChange} />
          )}
        </main>

        <footer className={s.footer}>
          <div className={s.footerInner}>
            <p>
              Only Robinhood Stock Tokens on Robinhood Chain (ID 4663) count, matched by contract address from
              Robinhood&apos;s own registry. Other tokens sent to the vault are not counted and can&apos;t be returned.
            </p>
            <p>
              Stock Tokens may not be offered, sold or delivered to US persons, and their issuer can pause, block or burn
              them. Prices are estimates.
            </p>
            <p>
              Lady Liberty is a community project. Not affiliated with, endorsed by, or officially connected with
              Robinhood Markets, Inc., Torch, or any token issuer.
            </p>
          </div>
        </footer>
      </div>
    </AnnouncerProvider>
  );
}

function Mark() {
  return (
    <svg width="34" height="31" viewBox="0 0 64 58" aria-hidden="true">
      <path d="M32 2 L34 18 L32 28 L30 18 Z" fill="#B8733A" />
      <ellipse cx="32" cy="8" rx="14" ry="8" fill="#5FB59B" />
      <path d="M18 28 Q32 24 46 28 L48 52 Q32 58 16 52 Z" fill="#5FB59B" />
      <path d="M48 30 Q56 34 52 44 L48 42" fill="#B8733A" />
      <ellipse cx="54" cy="38" rx="5" ry="8" fill="#6EE786" opacity="0.9" />
      <path d="M30 18 L24 20 L28 52 L36 52 L40 20 Z" fill="#DCF5EB" />
    </svg>
  );
}
