"use client";

import { explorer } from "../_lib/chain";
import { VAULT } from "../_lib/config";
import s from "../freedom.module.css";
import { CopyButton, ExternalLink, GroupedAddress } from "./ui";

// The vault address, shown in full and in groups of four. Address poisoning is the obvious
// attack on a dust raffle, so the warning sits right next to the address it protects.
export default function VaultBlock({ showCopy = true }: { showCopy?: boolean }) {
  return (
    <div className={s.notice}>
      <span className={s.noticeTitle}>Raffle vault</span>
      {VAULT.status === "set" ? (
        <>
          <div className={s.addrBlock}>
            <GroupedAddress address={VAULT.address} label="Raffle vault address" />
          </div>
          <div className={s.actions}>
            {showCopy && <CopyButton value={VAULT.address} label="Vault address" />}
            <ExternalLink href={explorer.address(VAULT.address)}>Check it on the explorer</ExternalLink>
          </div>
        </>
      ) : (
        <p className={s.p}>
          <strong>Vault not deployed yet.</strong>{" "}
          {VAULT.status === "invalid"
            ? "The vault address in this build's settings isn't a valid address, so it is ignored."
            : "There is no address to send to, so every send action on this page is switched off."}
        </p>
      )}
      <p className={`${s.p} ${s.small}`} style={{ marginTop: 12 }}>
        Don&apos;t copy this address from your wallet history. Scammers send tiny amounts from look-alike addresses so
        that a copied address goes to them. Take it from this page each time and compare every character, not just the
        start and the end. Tokens you didn&apos;t ask for can be bait in the same way.
      </p>
    </div>
  );
}
