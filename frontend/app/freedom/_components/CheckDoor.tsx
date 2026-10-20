"use client";

import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { checkAddressInput } from "../_lib/address";
import type { Registry } from "../_lib/registry";
import type { Holding } from "../_lib/scan";
import s from "../freedom.module.css";
import NoConnectPlan from "./NoConnectPlan";
import ScanPanel from "./ScanPanel";
import { GroupedAddress, StepHeading, useAnnounce } from "./ui";

// The no-connect door. No wallet library is loaded here: it reads public chain data for an
// address someone typed, then hands them links, QR codes and copyable details.
export default function CheckDoor({ registry, onConnectInstead }: { registry: Registry; onConnectInstead: () => void }) {
  const announce = useAnnounce();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<{ address: Address; checksum: "valid" | "none" } | null>(null);
  const [plan, setPlan] = useState<Holding[] | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Choosing this door is the person's own action, so moving focus to the field is expected.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = checkAddressInput(input);
    if (!res.ok) {
      setError(res.message);
      announce(res.message, true);
      return;
    }
    setError(null);
    setPlan(null);
    setTarget({ address: res.address, checksum: res.checksum });
    setScanKey((k) => k + 1);
  }

  return (
    <div>
      <section className={s.section} aria-labelledby="check-heading">
        <StepHeading id="check-heading" focus={false}>
          Check an address
        </StepHeading>
        <p className={s.p}>
          <span className={s.badge}>View only</span>{" "}
          <span className={s.muted}>
            This reads public blockchain data for the address you enter. No wallet, no connection, no signature. The
            address is sent to the network&apos;s RPC provider to read its balances.
          </span>
        </p>
        <form className={s.form} onSubmit={submit} noValidate>
          <label className={s.label} htmlFor="address-input">
            Address on Robinhood Chain
          </label>
          <div className={s.inputRow}>
            <input
              id="address-input"
              ref={inputRef}
              className={s.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0x..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? "address-error" : "address-hint"}
            />
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`}>
              Check this address
            </button>
          </div>
          {error ? (
            <p id="address-error" className={s.fieldError}>
              {error}
            </p>
          ) : (
            <p id="address-hint" className={s.fieldNote}>
              Paste the full address that starts with 0x. Names like .eth aren&apos;t supported yet.
            </p>
          )}
        </form>

        {target && (
          <div className={s.addrBlock} style={{ marginTop: 16 }}>
            <span className={`${s.small} ${s.muted}`}>Checking</span>
            <div>
              <GroupedAddress address={target.address} label="Address being checked" />
            </div>
            {target.checksum === "none" && (
              <p className={s.fieldNote} style={{ marginTop: 6 }}>
                This address has no capital letters, so there is no checksum to catch a typo. Compare every character
                with your wallet.
              </p>
            )}
          </div>
        )}
      </section>

      {/* The scan stays mounted while the plan is open, so going back keeps the list and the ticks. */}
      {target && (
        <div hidden={Boolean(plan)}>
          <ScanPanel
            key={`${target.address}-${scanKey}`}
            registry={registry}
            address={target.address}
            continueLabel="Make a send plan"
            onContinue={(picked) => setPlan(picked)}
          />
        </div>
      )}

      {target && plan && (
        <NoConnectPlan
          registry={registry}
          address={target.address}
          items={plan}
          onBack={() => {
            setPlan(null);
            window.setTimeout(() => document.getElementById("scan-heading")?.focus(), 0);
          }}
          onConnectInstead={onConnectInstead}
        />
      )}
    </div>
  );
}
