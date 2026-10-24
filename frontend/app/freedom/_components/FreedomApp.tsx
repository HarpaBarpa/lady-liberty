"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
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
        <a className={s.skip} href="#main">
          Skip to content
        </a>

        <header className={s.header}>
          <div className={s.bar}>
            <Link href="/" className={s.brand} aria-label="Lady Liberty, main site">
              <Mark />
              <span className={s.brandText}>
                <span className={s.brandName}>Lady Liberty</span>
                <span className={s.brandSub}>RWA raffle</span>
              </span>
            </Link>
            <nav className={s.nav} aria-label="Freedom machine">
              <a className={`${s.navLink} ${s.navHide}`} href="#doors">
                Pick a door
              </a>
              <Link className={s.navLink} href="/">
                Main site
              </Link>
            </nav>
          </div>
        </header>

        <main id="main">
          <section className={s.pedestal} aria-labelledby="page-title">
            <div className={s.wrap}>
              <p className={s.levelTag}>The freedom machine · 154 ft</p>
              <div className={s.heroGrid}>
                <figure className={s.heroArt}>
                  <Image
                    src="/freedom/pedestal-vault.webp"
                    width={900}
                    height={900}
                    priority
                    alt="A granite pedestal with a round copper vault door standing open. The vault is empty except for one unimpressed pigeon."
                  />
                </figure>
                <div>
                  <p className={s.statusChip}>
                    <span className={`${s.dot} ${s.dotCopper}`} aria-hidden="true" />
                    Concept preview · Not live yet
                  </p>
                  <h1 id="page-title" className={s.title}>
                    Set your <em>dust</em> free.
                  </h1>
                  <p className={s.lede}>
                    The freedom machine finds the small <strong>Robinhood Stock Token</strong> balances sitting in a
                    wallet and helps you send the ones you pick to the raffle vault. Every send is a plain token
                    transfer that you approve yourself.
                  </p>
                  <VaultPlaque />
                </div>
              </div>
            </div>
          </section>

          <section className={s.doorsLvl} id="doors" aria-labelledby="doors-title">
            <div className={s.wrapNarrow}>
              <p className={s.levelTag}>Step 1 · Pick a door</p>
              <h2 id="doors-title" className={s.h2}>
                Two ways in. The same scan.
              </h2>
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
                    Paste any address to see what it holds, then send from your own wallet app with a link, a QR code
                    or copied details.
                  </span>
                  <span className={s.doorNote}>Read-only · no wallet connection</span>
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
                  <span className={s.doorNote}>Shares your address only · you approve every send</span>
                </button>
              </div>
              {busy ? (
                <p className={s.fieldNote}>Finish or stop the current send before switching doors.</p>
              ) : (
                <p className={s.aside}>Nothing moves until you say so.</p>
              )}

              {door && !registry && (
                <section className={s.section}>
                  <p className={s.progress}>
                    <span className={s.flame} aria-hidden="true" />
                    Loading Robinhood&apos;s Stock Token list.
                  </p>
                </section>
              )}

              {door === "check" && registry && (
                <CheckDoor registry={registry} onConnectInstead={() => setDoor("connect")} />
              )}
              {door === "connect" && registry && (
                <ConnectDoor registry={registry} onCheckInstead={() => setDoor("check")} onBusyChange={onBusyChange} />
              )}
            </div>
          </section>
        </main>

        <footer className={s.footer}>
          <div className={s.footerInner}>
            <Link href="/" className={s.brand}>
              <Mark />
              <span className={s.brandText}>
                <span className={s.brandName}>Lady Liberty</span>
                <span className={s.brandSub}>RWA raffle</span>
              </span>
            </Link>
            <p>
              Only Robinhood Stock Tokens on Robinhood Chain (ID 4663) count, matched by contract address from
              Robinhood&apos;s own registry. Other tokens sent to the vault are not counted and can&apos;t be returned.
            </p>
            <p>
              Stock Tokens may not be offered, sold or delivered to US persons, and their issuer can pause, block or burn
              them. Prices are estimates.
            </p>
            <div className={s.footerBase}>
              <p>
                Community concept. Not affiliated with, endorsed by, or officially connected with Robinhood Markets, Inc.,
                Torch, or any token issuer.
              </p>
              <p>Not financial advice. I&apos;m a statue.</p>
            </div>
          </div>
        </footer>
      </div>
    </AnnouncerProvider>
  );
}

// The vault's status, in the plaque the site uses for its prize vault.
function VaultPlaque() {
  return (
    <div className={s.plaque} role="group" aria-label="Raffle vault status">
      <p className={s.plaqueLabel}>Raffle vault</p>
      {VAULT.status === "set" ? (
        <>
          <p className={s.plaqueValue}>Open for sends</p>
          <div className={s.addrBlock}>
            <GroupedAddress address={VAULT.address} label="Raffle vault address" />
          </div>
          <p className={s.plaqueNote}>
            <ExternalLink href={explorer.address(VAULT.address)}>Check it on the explorer</ExternalLink>
          </p>
        </>
      ) : (
        <>
          <p className={s.plaqueValue}>Not deployed yet</p>
          <p className={s.plaqueState}>
            <span className={`${s.dot} ${s.dotCopper}`} aria-hidden="true" />
            Sending is switched off
          </p>
          <p className={s.plaqueNote}>
            You can still check any address and walk through every step. Send buttons stay off until a real vault exists.
          </p>
        </>
      )}
    </div>
  );
}

// The site's crown-and-flame mark.
function Mark() {
  return (
    <svg className={s.mark} viewBox="0 0 64 58" aria-hidden="true">
      <g fill="currentColor">
        <polygon points="3.47,26.73 13.78,27.35 12.18,32.29" />
        <polygon points="9.71,15.93 18.88,20.69 15.40,24.55" />
        <polygon points="19.8,8.6 26.24,16.66 21.48,18.78" />
        <polygon points="32,4.5 34.6,16 29.4,16" />
        <polygon points="44.2,8.6 42.52,18.78 37.76,16.66" />
        <polygon points="54.29,15.93 48.60,24.55 45.12,20.69" />
        <polygon points="60.53,26.73 51.82,32.29 50.22,27.35" />
        <circle cx="32" cy="37" r="18" />
      </g>
      <path
        fill="var(--flame, #6EE786)"
        transform="translate(32 38.5) scale(0.56) translate(-32 -32)"
        d="M32 6C35.5 12 41 17.5 40.6 24.5C40.3 27.5 38.8 29.6 37 31C37.6 25 35.6 19 32 15.5C28.6 20.5 24.5 25 22.6 30.5C21.8 33 21.5 36 21.5 39.5C21.5 45 26 49.5 31.5 49.5C37 49.5 41.5 45 41.5 39.5C41.5 36.5 42.3 33.5 43 31.5C46 34.5 47.5 38.5 47.5 43C47.5 51 40.5 57.8 32 57.8C23.2 57.8 16.5 51.5 16.5 43.5C16.5 31 26 19 32 6Z"
      />
    </svg>
  );
}
