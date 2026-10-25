"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import {
  createConfig,
  injected,
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
  useSwitchChain,
  WagmiProvider,
  type Connector,
} from "wagmi";
import { getCapabilities } from "wagmi/actions";
import { robinhood, rpcTransport } from "../_lib/chain";
import { CHAIN_ID, CHAIN_NAME, VAULT } from "../_lib/config";
import { metamaskDapp } from "../_lib/links";
import type { Registry } from "../_lib/registry";
import type { Holding, Scan } from "../_lib/scan";
import { isUserRejection, shortError } from "../_lib/send";
import s from "../freedom.module.css";
import ReviewSends from "./ReviewSends";
import ScanPanel from "./ScanPanel";
import { RunView, useSendRun } from "./SendRunner";
import { GroupedAddress, StepHeading, useAnnounce } from "./ui";

// The connected door. This module, and with it wagmi, only loads after someone picks
// "Connect a wallet". Connecting requests the account and nothing else.

const config = createConfig({
  chains: [robinhood],
  connectors: [injected()],
  transports: { [robinhood.id]: rpcTransport() },
  multiInjectedProviderDiscovery: true,
  // Needed even though this module only renders in the browser: without it wagmi's Hydrate runs
  // its mount step on every render, and with reconnectOnMount off that step clears the
  // connection, so any parent re-render (such as the run marking the page busy) disconnected
  // the wallet mid-send.
  ssr: true,
});

const queryClient = new QueryClient();

type DoorProps = { registry: Registry; onCheckInstead: () => void; onBusyChange: (busy: boolean) => void };

export default function ConnectDoor(props: DoorProps) {
  // reconnectOnMount is off so that no wallet is touched until the person presses Connect,
  // even one that has authorized this site before.
  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <ConnectFlow {...props} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function ConnectFlow({ registry, onCheckInstead, onBusyChange }: DoorProps) {
  const conn = useConnection();
  if (conn.status !== "connected" || !conn.address) return <ConnectPanel onCheckInstead={onCheckInstead} />;
  return <Connected key={conn.address} address={conn.address} registry={registry} onBusyChange={onBusyChange} />;
}

function ConnectPanel({ onCheckInstead }: { onCheckInstead: () => void }) {
  const announce = useAnnounce();
  const connectors = useConnectors();
  const connect = useConnect();
  // This module never renders on the server (next/dynamic with ssr: false), so window is safe here.
  const [hasInjected] = useState(() => Boolean((window as { ethereum?: unknown }).ethereum));
  const [pageUrl] = useState(() => window.location.href);
  const [error, setError] = useState<string | null>(null);

  // EIP-6963 announces each installed wallet by name; the generic connector is only a fallback.
  const discovered = connectors.filter((c) => c.id !== "injected");
  const list: Connector[] = discovered.length ? discovered : hasInjected ? connectors.filter((c) => c.id === "injected") : [];

  function pick(c: Connector) {
    setError(null);
    announce(`Asking ${c.name} to share your address. Approve it in your wallet.`);
    // No chainId here on purpose: passing one would make wagmi switch networks as part of the
    // connect. Switching only ever happens when the person presses the switch button.
    connect.mutate(
      { connector: c },
      {
        onSuccess: () => announce("Connected. Only your address was shared."),
        onError: (e) => {
          const msg = isUserRejection(e)
            ? "You cancelled the connection. Nothing was shared."
            : `Couldn't connect: ${shortError(e)}`;
          setError(msg);
          announce(msg, true);
        },
      },
    );
  }

  return (
    <section className={s.section} aria-labelledby="connect-heading">
      <StepHeading id="connect-heading" tag="Step 2 · Connect">Connect a wallet</StepHeading>
      <p className={s.p}>
        Connecting only shares your address. Nothing can move without a separate confirmation in your wallet, and this
        app never asks for approvals, permits or signatures.
      </p>

      {list.length > 0 ? (
        <ul className={s.wallets}>
          {list.map((c) => (
            <li key={c.uid}>
              <button
                type="button"
                className={`${s.btn} ${s.walletBtn}`}
                onClick={() => pick(c)}
                disabled={connect.isPending}
              >
                {c.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.icon} alt="" className={s.walletIcon} />
                ) : null}
                Connect {c.id === "injected" ? "browser wallet" : c.name}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={s.notice}>
          <span className={s.noticeTitle}>No browser wallet found on this device</span>
          <p className={s.p}>
            On a phone, open this page inside your wallet app&apos;s own browser. On a computer, install a wallet
            extension that supports {CHAIN_NAME}, or check an address instead and send from your wallet app.
          </p>
          <div className={s.actions}>
            {pageUrl && (
              <a className={s.btn} href={metamaskDapp(pageUrl)} rel="noopener noreferrer">
                Open this page in MetaMask
              </a>
            )}
            <button type="button" className={s.btn} onClick={onCheckInstead}>
              Check an address instead
            </button>
          </div>
        </div>
      )}

      {connect.isPending && <p className={s.fieldNote}>Waiting for your wallet. Approve the connection there.</p>}
      {error && <p className={s.fieldError}>{error}</p>}
    </section>
  );
}

function Connected({
  address,
  registry,
  onBusyChange,
}: {
  address: Address;
  registry: Registry;
  onBusyChange: (busy: boolean) => void;
}) {
  const announce = useAnnounce();
  const conn = useConnection();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const run = useSendRun(config, registry);
  const [stage, setStage] = useState<"scan" | "review" | "run">("scan");
  const [picked, setPicked] = useState<Holding[]>([]);
  const [scan, setScan] = useState<Scan | null>(null);
  const [scanKey, setScanKey] = useState(0);

  const chainOk = conn.chainId === CHAIN_ID;
  const busy = run.state?.phase === "running" || run.state?.phase === "paused";

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);
  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  function doSwitch() {
    announce("Asking your wallet to switch to Robinhood Chain.");
    switchChain.mutate(
      { chainId: CHAIN_ID },
      {
        onSuccess: () => announce("Your wallet is on Robinhood Chain."),
        onError: (e) =>
          announce(
            isUserRejection(e) ? "Switch cancelled. Your wallet stayed on its network." : `Couldn't switch: ${shortError(e)}`,
            true,
          ),
      },
    );
  }

  const checkAtomic = useCallback(async () => {
    const caps = (await getCapabilities(config, { chainId: CHAIN_ID })) as { atomic?: { status?: string } };
    return caps?.atomic?.status === "supported";
  }, []);

  return (
    <>
      <section className={s.section} aria-labelledby="wallet-heading">
        <div className={s.connectedHead}>
          <div style={{ minWidth: 0 }}>
            <p className={s.levelTag}>Step 2 · Connected</p>
            <h2 id="wallet-heading" className={s.h2}>
              Your wallet
            </h2>
            <p className={`${s.small} ${s.muted}`} style={{ margin: 0 }}>
              Connected with {conn.connector?.name ?? "your wallet"}. Only your address is shared.
            </p>
          </div>
          <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => disconnect.mutate()} disabled={busy}>
            Disconnect
          </button>
        </div>
        <div className={s.addrBlock}>
          <GroupedAddress address={address} label="Connected address" />
        </div>
        {chainOk ? (
          <p className={`${s.small} ${s.muted}`} style={{ marginTop: 8 }}>
            Network: {CHAIN_NAME}
          </p>
        ) : (
          <div className={`${s.notice} ${s.noticeWarn}`}>
            <p className={s.p}>
              <strong>Your wallet is on another network.</strong> Reading balances works anyway; sending needs {CHAIN_NAME}.
            </p>
            <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={doSwitch} disabled={switchChain.isPending}>
              {switchChain.isPending ? "Waiting for your wallet" : "Switch to Robinhood Chain"}
            </button>
          </div>
        )}
      </section>

      <div hidden={stage !== "scan"}>
        <ScanPanel
          key={scanKey}
          registry={registry}
          address={address}
          continueLabel="Review these sends"
          onContinue={(chosen, sc) => {
            setPicked(chosen);
            setScan(sc);
            setStage("review");
          }}
        />
      </div>

      {stage === "review" && scan && (
        <ReviewSends
          owner={address}
          picked={picked}
          scan={scan}
          chainOk={chainOk}
          switching={switchChain.isPending}
          onSwitch={doSwitch}
          checkAtomic={checkAtomic}
          onBack={() => {
            setStage("scan");
            window.setTimeout(() => document.getElementById("scan-heading")?.focus(), 0);
          }}
          onStart={(mode, items) => {
            if (VAULT.status !== "set") return;
            setStage("run");
            void run.start(items, mode, address, VAULT.address);
          }}
        />
      )}

      {stage === "run" && (
        <RunView
          run={run}
          owner={address}
          onScanAgain={() => {
            run.reset();
            setPicked([]);
            setScan(null);
            setScanKey((k) => k + 1);
            setStage("scan");
          }}
        />
      )}
    </>
  );
}
