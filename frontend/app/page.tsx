"use client";
import { useState, useEffect, useCallback } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────
const RPC_URL    = process.env.NEXT_PUBLIC_RPC    || "";
const CONTRACT   = process.env.NEXT_PUBLIC_RWAFFLE || "";
const TICKETS_SELECTOR = "0xc1ff3d93";
const RAFFLE_SELECTOR  = "0x8c4c8e13"; // getCurrentRaffleInfo()

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 0 | 1 | 2 | 3;

interface RaffleInfo {
  phase:          Phase;
  prizePool:      string;
  commitDeadline: number;
  revealDeadline: number;
  raffleId:       number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addrParam(addr: string): string {
  return addr.slice(2).toLowerCase().padStart(64, "0");
}

async function ethCall(data: string): Promise<string> {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to: CONTRACT, data }, "latest"],
      id: 1,
    }),
  });
  const json = await res.json() as { result?: string };
  return json.result ?? "0x0";
}

function parseUint(hex: string): number {
  if (!hex || hex === "0x") return 0;
  return parseInt(hex, 16);
}

async function getRaffleInfo(): Promise<RaffleInfo | null> {
  try {
    const result = await ethCall(RAFFLE_SELECTOR);
    if (!result || result === "0x0" || result.length < 130) return null;
    const phase          = parseUint(result.slice(2, 66)) as Phase;
    const prizePoolWei   = parseUint(result.slice(66, 130));
    const commitDeadline = parseUint(result.slice(130, 194));
    const revealDeadline = parseUint(result.slice(194, 258));
    return {
      phase,
      prizePool: (prizePoolWei / 1e18).toFixed(4),
      commitDeadline,
      revealDeadline,
      raffleId: 1, // updated via separate view
    };
  } catch { return null; }
}

async function getTickets(address: string): Promise<number> {
  try {
    const result = await ethCall(TICKETS_SELECTOR + addrParam(address));
    return parseUint(result);
  } catch { return 0; }
}

function formatTime(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}

function phaseName(p: Phase): string {
  return ["Idle", "Commit", "Reveal", "Drawn"][p] ?? "—";
}

// ─── Commit-Reveal (Web Crypto) ──────────────────────────────────────────────
async function generateSecret(): Promise<string> {
  const buf = new Uint8Array(32);
  window.crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// keccak256 of packed encoding — done client-side via SubtleCrypto SHA-3
async function sha3(data: Uint8Array): Promise<Uint8Array> {
  // SHA-3 (Keccak) via browser SubtleCrypto
  const hash = await window.crypto.subtle.digest("SHA-3-256", data.buffer as ArrayBuffer);
  return new Uint8Array(hash);
}

async function hashSecret(secretHex: string, nonce: number): Promise<string> {
  // Pack: bytes32(secretHex) ++ uint256(nonce) — 32 bytes each
  const secretBytes = Uint8Array.from(
    Buffer.from(secretHex.startsWith("0x") ? secretHex.slice(2) : secretHex, "hex")
  );
  // pad/truncate to 32 bytes
  const secretPadded = new Uint8Array(32);
  secretBytes.slice(0, 32).forEach((b, i) => (secretPadded[i] = b));

  // nonce as 32-byte big-endian
  const nonceBytes = new Uint8Array(32);
  let n = BigInt(nonce);
  for (let i = 31; i >= 0; i--) {
    nonceBytes[i] = Number(n & 0xffn);
    n >>= 8n;
  }

  const packed = new Uint8Array(64);
  secretPadded.forEach((b, i) => (packed[i] = b));
  nonceBytes.forEach((b, i) => (packed[32 + i] = b));

  const digest = await sha3(packed);
  return "0x" + Array.from(digest).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [wallet, setWallet]         = useState("");
  const [tickets, setTickets]       = useState<number | null>(null);
  const [raffle, setRaffle]         = useState<RaffleInfo | null>(null);
  const [loading, setLoading]        = useState(false);
  const [status, setStatus]          = useState("");
  const [commitHash, setCommitHash]  = useState("");
  const [nonce, setNonce]            = useState(0);

  useEffect(() => {
    getRaffleInfo().then(setRaffle).catch(() => {});
    const id = setInterval(() => getRaffleInfo().then(setRaffle).catch(() => {}), 30_000);
    return () => clearInterval(id);
  }, []);

  const lookup = useCallback(async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      setStatus("❌ Invalid wallet address");
      return;
    }
    setLoading(true);
    setStatus("");
    setTickets(null);
    try {
      const t = await getTickets(wallet);
      setTickets(t);
    } catch {
      setStatus("❌ Could not reach the blockchain");
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  const handleGenerate = useCallback(async () => {
    try {
      const secret = await generateSecret();
      const hash   = await hashSecret(secret, nonce);
      setCommitHash(hash);
      setStatus(`✅ Commitment ready. Hash: ${hash.slice(0, 20)}...\nSave your secret: ${secret.slice(0, 8)}... (keep it private!)`);
    } catch {
      setStatus("❌ Failed to generate commitment");
    }
  }, [nonce]);

  return (
    <main className="min-h-screen bg-black text-white font-sans">

      {/* NAV */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🗽</span>
          <span className="font-bold text-lg tracking-tight">RWAFFLE</span>
        </div>
        <div className="text-sm text-gray-500">RWAFFLE × Lady Liberty 🔥</div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">

        <div className="inline-block bg-gray-900 border border-gray-700 rounded-full px-4 py-1 text-sm text-gray-400 mb-6">
          Powered by $LIBERTY on Robinhood Chain
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight">
          Liberate your dust.<br />
          <span className="text-green-400">Fuel the torch.</span>
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Send your unwanted crypto to the RWAFFLE contract and automatically earn raffle tickets.
          No wallet connections. No sign-ups. No swaps. Just send and win.
        </p>

        {/* RAFFLE STATUS */}
        {raffle && (
          <div className="inline-flex items-center gap-4 bg-gray-900 border border-gray-700 rounded-2xl px-8 py-5 mb-12">
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Prize Pool</p>
              <p className="text-3xl font-black text-green-400">{raffle.prizePool} ETH</p>
            </div>
            <div className="w-px h-12 bg-gray-700" />
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Phase</p>
              <p className={`text-xl font-bold ${raffle.phase === 1 ? "text-yellow-400" : raffle.phase === 2 ? "text-blue-400" : "text-gray-400"}`}>
                {phaseName(raffle.phase)}
              </p>
            </div>
            {raffle.phase === 1 && (
              <>
                <div className="w-px h-12 bg-gray-700" />
                <div className="text-left">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Commit closes</p>
                  <p className="text-sm font-mono">{formatTime(raffle.commitDeadline)}</p>
                </div>
              </>
            )}
            {raffle.phase === 2 && (
              <>
                <div className="w-px h-12 bg-gray-700" />
                <div className="text-left">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Reveal closes</p>
                  <p className="text-sm font-mono">{formatTime(raffle.revealDeadline)}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* WALLET LOOKUP */}
        <div className="max-w-xl mx-auto">
          <div className="flex gap-3">
            <input
              className="flex-1 bg-gray-900 border border-gray-700 focus:border-blue-500 rounded-xl px-4 py-4 font-mono text-sm outline-none transition-colors"
              placeholder="Paste your wallet address (0x...)"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              spellCheck={false}
            />
            <button
              onClick={lookup}
              disabled={loading || wallet.length < 42}
              className="bg-white text-black font-bold px-8 py-4 rounded-xl hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {loading ? "Loading..." : "Look Up"}
            </button>
          </div>

          {status && (
            <pre className="text-left text-sm text-gray-400 mt-3 bg-gray-900 rounded-xl p-4 whitespace-pre-wrap font-mono">
              {status}
            </pre>
          )}

          {tickets !== null && (
            <div className="mt-8 bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">Your Tickets</p>
              <p className="text-7xl font-black text-green-400">
                {Number(tickets).toLocaleString()}
              </p>
              <p className="text-gray-600 mt-3 text-sm">
                {tickets > 0
                  ? "You're in the draw! During the Commit phase, generate a commitment to contribute to the randomness."
                  : "No tickets yet — send supported tokens to the RWAFFLE contract to earn tickets."}
              </p>
            </div>
          )}

          {/* COMMIT-REVEAL UI */}
          {tickets !== null && tickets > 0 && raffle && raffle.phase === 1 && (
            <div className="mt-6 bg-gray-900 border border-gray-700 rounded-2xl p-8 text-left">
              <h3 className="font-bold text-lg mb-4">🔐 Contribute to Fairness</h3>
              <p className="text-gray-400 text-sm mb-6">
                Submit a commitment to mix your randomness into the draw. This makes the result impossible to manipulate.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="number"
                  className="bg-black border border-gray-700 rounded-xl px-4 py-3 font-mono text-sm w-32 outline-none"
                  placeholder="Nonce"
                  value={nonce}
                  onChange={(e) => setNonce(parseInt(e.target.value) || 0)}
                  min={0}
                />
                <button
                  onClick={handleGenerate}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                >
                  Generate &amp; Copy Hash
                </button>
              </div>
              {commitHash && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-1">Your commitment hash (submit this to the contract):</p>
                  <input
                    readOnly
                    value={commitHash}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 font-mono text-xs text-green-400 outline-none cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-gray-950 border-t border-gray-900 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              ["📤", "1. Send Your Dust", "Send any supported ERC-20 token from your self-custody wallet to the RWAFFLE contract. No bridging or swapping — just a normal transfer."],
              ["🎟️", "2. Earn Tickets", "The indexer detects your transfer, prices the token, and credits your wallet with raffle tickets. $1 of dust = 100 tickets automatically."],
              ["🏆", "3. Win & Withdraw", "Winner selected via commit-reveal randomness. Prize sent directly to your wallet — no claim step required."],
            ].map(([icon, title, desc]) => (
              <div key={title} className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="font-bold text-lg mb-3">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* COMMIT-REVEAL EXPLAINER */}
          <div className="mt-16 bg-gray-900 border border-gray-800 rounded-2xl p-8 md:p-12">
            <h3 className="font-bold text-xl mb-6">🔐 Provably Fair Randomness</h3>
            <p className="text-gray-400 leading-relaxed mb-8">
              The winner is selected using <strong className="text-white">commit-reveal</strong> — a cryptographic scheme no one can manipulate.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                ["1", "yellow", "Commit Phase", "Generate a secret locally and submit its hash. No one can see it yet."],
                ["2", "blue", "Reveal Phase", "After the commit window closes, reveal your secret to mix it into the randomness pool."],
                ["3", "green", "Draw", "All revealed secrets combine with block data to produce the final random number."],
                ["4", "purple", "Winner", "Selected by weighted ticket count. Prize sent to your wallet automatically."],
              ].map(([step, color, title, desc]) => (
                <div key={step} className="flex gap-3">
                  <span className={`flex-shrink-0 w-8 h-8 rounded-full bg-${color}-500 text-white font-bold flex items-center justify-center text-sm`}>{step}</span>
                  <div>
                    <p className="font-medium text-sm">{title}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-black mb-12">FAQ</h2>
        <div className="space-y-6">
          {[
            ["Which tokens are supported?", "A curated list of major ERC-20 tokens. Unsupported tokens sent to the contract will not earn tickets."],
            ["Do I need to connect my wallet?", "No. Your wallet address IS your raffle account. Paste it above to see your tickets."],
            ["What happens to my tickets after a draw?", "Tickets reset each raffle. Accumulate more by sending dust before the next commit window."],
            ["What is the $LIBERTY connection?", "10% of every prize pool funds $LIBERTY buybacks, creating value for all holders."],
            ["Can I lose my dust?", "Dust sent to the contract is pooled for prizes. You receive tickets in return — not a loss."],
            ["When are draws?", "After a 2-day commit window and a 1-day reveal window. Check the raffle status above."],
            ["Is this on-chain?", "Yes. The RWAFFLE contract, all transfers, and the draw are verifiable on Robinhood Chain."],
          ].map(([q, a]) => (
            <div key={q} className="border border-gray-800 rounded-xl p-6">
              <p className="font-bold mb-2">{q}</p>
              <p className="text-gray-400 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-900 py-8 text-center text-gray-600 text-sm">
        <p>RWAFFLE × Lady Liberty 🗽🔥 &nbsp;·&nbsp; Built on Robinhood Chain &nbsp;·&nbsp; Powered by $LIBERTY</p>
      </footer>
    </main>
  );
}
