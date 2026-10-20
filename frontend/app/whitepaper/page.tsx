export const metadata = {
  title: "Whitepaper · LibertyTorch",
  description: "The full story behind $LIBERTY — brand, tokenomics, and the flame.",
};

export default function WhitepaperPage() {
  return (
    <main style={{ background: "#0A1F21", color: "#F7FFFB", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{
        borderBottom: "1px solid #3F6466",
        padding: "0 24px",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        background: "rgba(10,31,33,0.95)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <svg width="38" height="34" viewBox="0 0 64 58" aria-hidden="true">
            <defs>
              <symbol id="mark" viewBox="0 0 64 58">
                <path d="M32 2 L34 18 L32 28 L30 18 Z" fill="#B8733A"/>
                <ellipse cx="32" cy="8" rx="14" ry="8" fill="#5FB59B"/>
                <path d="M18 28 Q32 24 46 28 L48 52 Q32 58 16 52 Z" fill="#5FB59B"/>
                <path d="M48 30 Q56 34 52 44 L48 42" fill="#B8733A"/>
                <ellipse cx="54" cy="38" rx="5" ry="8" fill="#6EE786" opacity="0.9"/>
                <path d="M30 18 L24 20 L28 52 L36 52 L40 20 Z" fill="#DCF5EB"/>
              </symbol>
            </defs>
            <use href="#mark" fill="#5FB59B"/>
          </svg>
          <div>
            <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: "1.1rem", color: "#F7FFFB" }}>Lady Liberty</span>
            <span style={{ display: "block", fontSize: "0.75rem", color: "#3F6466", fontWeight: 600, marginTop: "1px" }}>LIBERTY TORCH</span>
          </div>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a href="/#about" style={{ color: "#DCF5EB", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>About</a>
          <a href="/#token" style={{ color: "#DCF5EB", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>Token</a>
          <a href="/whitepaper" style={{ color: "#6EE786", textDecoration: "none", fontSize: "0.9rem", fontWeight: 700 }}>Whitepaper</a>
        </div>
      </nav>

      {/* HEADER */}
      <header style={{
        padding: "80px 24px 60px",
        textAlign: "center",
        borderBottom: "1px solid #3F6466",
      }}>
        <p style={{ fontSize: "0.75rem", color: "#6EE786", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>
          Official Whitepaper
        </p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2.5rem, 6vw, 4rem)", fontWeight: 900, lineHeight: 1.1, color: "#F7FFFB", marginBottom: "24px" }}>
          LibertyTorch<br /><span style={{ color: "#6EE786" }}>🗽🔥</span>
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#DCF5EB", opacity: 0.7, maxWidth: "560px", margin: "0 auto 16px", lineHeight: 1.6 }}>
          $LIBERTY is a community token on Torch — built on the Statue of Liberty as its brand and narrative anchor.
        </p>
        <p style={{ fontSize: "0.8rem", color: "#3F6466" }}>
          v1.0 &nbsp;·&nbsp; October 2026 &nbsp;·&nbsp; Robinhood Chain &nbsp;·&nbsp; Torch Launchpad
        </p>
      </header>

      {/* TABLE OF CONTENTS */}
      <nav style={{
        background: "#174C4F",
        padding: "32px 24px",
        borderBottom: "1px solid #3F6466",
      }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <p style={{ fontSize: "0.7rem", color: "#3F6466", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>Contents</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
            {[
              ["1 · Abstract", "#abstract"],
              ["2 · The Brand", "#brand"],
              ["3 · The Technology", "#technology"],
              ["4 · The Token", "#token"],
              ["5 · Tokenomics", "#tokenomics"],
              ["6 · The Flywheel", "#flywheel"],
              ["7 · Community", "#community"],
              ["8 · FAQ", "#faq"],
              ["9 · Risk Disclosure", "#risks"],
            ].map(([label, href]) => (
              <a key={href} href={href} style={{
                color: "#DCF5EB", textDecoration: "none", fontSize: "0.9rem",
                padding: "6px 0", borderBottom: "1px solid rgba(63,100,102,0.5)",
              }}>{label}</a>
            ))}
          </div>
        </div>
      </nav>

      {/* SECTIONS */}
      <article style={{ maxWidth: "760px", margin: "0 auto", padding: "0 24px 80px" }}>

        {/* 1. Abstract */}
        <section id="abstract" style={{ paddingTop: "64px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.9rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "20px" }}>
            1. Abstract
          </h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>
            LibertyTorch is a community token built on <strong style={{ color: "#6EE786" }}>Torch</strong>, deployed on <strong style={{ color: "#6EE786" }}>Robinhood Chain</strong>. Its brand is Lady Liberty — the Statue of Liberty reimagined as a friendly character, torch raised high, mint green flame burning bright.
          </p>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>
            The idea is simple: liberation, second chances, turning forgotten things into meaningful wins. $LIBERTY is the token. The community is the point.
          </p>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9 }}>
            There are no promises, no roadmap theater, no team tokens. Just a torch, a statue, and a flame that burns for everyone.
          </p>
        </section>

        {/* 2. The Brand */}
        <section id="brand" style={{ paddingTop: "64px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.9rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "20px" }}>
            2. The Brand — Lady Liberty
          </h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>
            Lady Liberty is the Statue of Liberty reimagined as a friendly anime character. She's not a corporate mascot — she's a symbol. She has always stood for something: the tired, the poor, the huddled masses yearning to breathe free.
          </p>

          <div style={{ background: "#174C4F", borderRadius: "16px", padding: "28px", margin: "28px 0" }}>
            <p style={{ fontSize: "0.7rem", color: "#6EE786", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>Visual Identity</p>
            {[
              ["Style", "Hand-inked anime editorial illustration — confident ink contours, selective flat cel shadows, matte surfaces, subtle gouache and paper grain"],
              ["Hair", "Short sculptural sea-green bob"],
              ["Features", "Copper freckles, kind teal eyes"],
              ["Crown", "Seven-ray patina crown"],
              ["Attire", "Seafoam toga"],
              ["Pose", "Torch raised high"],
              ["Flame", "Mint green (#6EE786) — the single glowing light source"],
              ["Palette", "Harbor teal · Seafoam · Porcelain · Patina · Torch mint · Copper"],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px", marginBottom: "8px", fontSize: "0.9rem" }}>
                <span style={{ color: "#6EE786", fontWeight: 700 }}>{k}</span>
                <span style={{ color: "#DCF5EB", opacity: 0.8 }}>{v}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9 }}>
            The brand's narrative thread: liberation, second chances, overlooked things becoming meaningful. The torch is literal (on-chain) and symbolic (the community's light). No pigeons.
          </p>
        </section>

        {/* 3. The Technology */}
        <section id="technology" style={{ paddingTop: "64px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.9rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "20px" }}>
            3. The Technology
          </h2>

          <h3 style={{ fontSize: "1.1rem", color: "#6EE786", fontWeight: 700, marginBottom: "12px" }}>Torch Launchpad</h3>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>
            Torch is a token launchpad built on Robinhood Chain. It handles the full token lifecycle in one transaction — no custom Solidity required. Every Torch token address ends in <strong style={{ color: "#6EE786" }}>1111</strong>, the signature of a real Torch launch.
          </p>

          <h3 style={{ fontSize: "1.1rem", color: "#6EE786", fontWeight: 700, marginBottom: "12px" }}>Robinhood Chain</h3>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>
            Robinhood Chain is an EVM-compatible blockchain operated by Robinhood Markets, Inc. It uses ETH for gas. ETH on Robinhood Chain is distinct from ETH on other networks — it must be bridged or purchased directly on-network.
          </p>

          <div style={{ background: "#174C4F", borderRadius: "16px", padding: "28px", margin: "28px 0" }}>
            <p style={{ fontSize: "0.7rem", color: "#6EE786", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>Key Addresses</p>
            {[
              ["$TORCH", "0x000050E18ffa3F8F7aD170Eb9CeF160eb3Ed1111"],
              ["Torch Launchpad", "0x7891eA889899928aFE637e4Cca8106188427776a"],
              ["$LIBERTY", "0x___________1111 (assigned at launch)"],
              ["Explorer", "robinhoodchain.io"],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px", marginBottom: "8px", fontSize: "0.9rem" }}>
                <span style={{ color: "#6EE786", fontWeight: 700 }}>{k}</span>
                <span style={{ color: "#DCF5EB", opacity: 0.8, fontFamily: "monospace", wordBreak: "break-all" }}>{v}</span>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: "1.1rem", color: "#6EE786", fontWeight: 700, marginBottom: "12px" }}>Smart Contract Properties</h3>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9 }}>
            Torch tokens are non-negotiable in their constraints: no owner, no pause function, no blacklist, no mint capability. Once launched, the contract is immutable. Liquidity is locked via the Torch launchpad — it cannot be rugged.
          </p>
        </section>

        {/* 4. The Token */}
        <section id="token" style={{ paddingTop: "64px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.9rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "20px" }}>
            4. The Token — $LIBERTY
          </h2>

          <div style={{ background: "#174C4F", borderRadius: "20px", padding: "32px", margin: "20px 0" }}>
            {[
              ["Name", "LIBERTY"],
              ["Ticker", "$LIBERTY"],
              ["Network", "Robinhood Chain"],
              ["Standard", "ERC-20"],
              ["Total Supply", "1,000,000,000 (fixed — no mint)"],
              ["Decimals", "18"],
              ["Launchpad", "Torch (Quick Launch)"],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "8px", marginBottom: "12px", fontSize: "0.95rem" }}>
                <span style={{ color: "#3F6466", fontWeight: 600 }}>{k}</span>
                <span style={{ color: "#F7FFFB", fontFamily: "monospace" }}>{v}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9 }}>
            $LIBERTY launched via Torch Quick Launch — one transaction, no custom smart contract. The full supply entered a Uniswap v4 liquidity pool at launch, locked forever via the Torch launchpad.
          </p>
        </section>

        {/* 5. Tokenomics */}
        <section id="tokenomics" style={{ paddingTop: "64px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.9rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "20px" }}>
            5. Tokenomics
          </h2>

          <h3 style={{ fontSize: "1.1rem", color: "#6EE786", fontWeight: 700, marginBottom: "12px" }}>Tax Structure</h3>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>
            <strong style={{ color: "#6EE786" }}>Buy tax: 4%</strong> — applied on every buy, fixed forever. <strong style={{ color: "#6EE786" }}>Sell tax: 0%</strong> — Torch never taxes sells. This is a Torch constraint, not a choice.
          </p>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>
            Of every 4% buy tax collected: <strong style={{ color: "#F7FFFB" }}>30% goes to Torch</strong> (platform fee), <strong style={{ color: "#F7FFFB" }}>70% goes to the creator wallet</strong> (us). We commit to deploying our share toward community initiatives — grants, liquidity incentives, events, and whatever the community decides.
          </p>

          <h3 style={{ fontSize: "1.1rem", color: "#6EE786", fontWeight: 700, marginBottom: "12px" }}>Pair Asset</h3>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>
            $LIBERTY is paired against <strong style={{ color: "#6EE786" }}>$TORCH</strong>. Every trade is literally fueling the torch. Tax payouts accumulate in $TORCH. The narrative is tight because it's literal.
          </p>

          <h3 style={{ fontSize: "1.1rem", color: "#6EE786", fontWeight: 700, marginBottom: "12px" }}>Starting Market Cap</h3>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>
            Launch preset: <strong style={{ color: "#6EE786" }}>Launch (2.5 ETH)</strong>. Balanced risk — not as conservative as Steady, not as volatile as Degen. "Launch Complete" at 10× = 25 ETH market cap. The community owns the float from day one.
          </p>

          <h3 style={{ fontSize: "1.1rem", color: "#6EE786", fontWeight: 700, marginBottom: "12px" }}>Dev Buy</h3>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>
            2% of supply (~20,000,000 $LIBERTY) purchased at launch, no tax. This is our skin in the game — not a cash grab. It gives us a small war chest to contribute toward community initiatives without touching the tax revenue.
          </p>

          <div style={{ background: "rgba(110,231,134,0.08)", border: "1px solid rgba(110,231,134,0.2)", borderRadius: "12px", padding: "24px", margin: "28px 0" }}>
            <p style={{ fontSize: "0.7rem", color: "#6EE786", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>Tax Revenue Projections (Conservative)</p>
            {[
              ["Scenario", "Daily Volume", "Daily Tax (our 70%)"],
              ["Low", "1 ETH/day", "~8.4 $TORCH"],
              ["Base", "3 ETH/day", "~25.2 $TORCH"],
              ["Strong", "10 ETH/day", "~84 $TORCH"],
            ].map(([scenario, vol, tax], i) => (
              <div key={String(scenario)} style={{
                display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: "8px",
                padding: "10px 0", borderBottom: i < 3 ? "1px solid rgba(110,231,134,0.15)" : "none",
                fontSize: "0.9rem",
              }}>
                <span style={{ color: i === 0 ? "#6EE786" : "#DCF5EB", fontWeight: i === 0 ? 700 : 400 }}>{scenario}</span>
                <span style={{ color: "#DCF5EB" }}>{vol}</span>
                <span style={{ color: "#6EE786" }}>{tax}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 6. The Flywheel */}
        <section id="flywheel" style={{ paddingTop: "64px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.9rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "20px" }}>
            6. The Flywheel
          </h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "24px" }}>
            $LIBERTY's tokenomics are designed to create a self-reinforcing flywheel. Every trade generates tax. Tax funds community. Community drives adoption. Adoption drives trades.
          </p>

          <div style={{ background: "#174C4F", borderRadius: "20px", padding: "32px", margin: "20px 0" }}>
            {[
              { step: "1", title: "Traders buy $LIBERTY", desc: "Buyers pay 4% tax. 70% flows to the creator wallet." },
              { step: "2", title: "Tax funds community initiatives", desc: "Grants, liquidity incentives, events, community decisions." },
              { step: "3", title: "Community grows", desc: "More holders. More awareness. More social traction." },
              { step: "4", title: "Volume increases", desc: "More trading = more tax = more funding for the next cycle." },
              { step: "5", title: "Price follows", desc: "Sustained buy pressure from tax-funded initiatives lifts the floor." },
            ].map(({ step, title, desc }, i) => (
              <div key={String(step)} style={{ display: "grid", gridTemplateColumns: "40px 1fr", gap: "16px", marginBottom: i < 4 ? "24px" : "0" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "50%",
                  background: "rgba(110,231,134,0.15)", border: "1px solid #6EE786",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#6EE786", fontWeight: 900, fontSize: "1rem", flexShrink: 0,
                }}>{step}</div>
                <div>
                  <p style={{ color: "#F7FFFB", fontWeight: 700, fontSize: "1rem", marginBottom: "4px" }}>{title}</p>
                  <p style={{ color: "#DCF5EB", opacity: 0.7, fontSize: "0.9rem" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9 }}>
            The key insight: the tax isn't a cost — it's a mechanism. Every buy is a contribution to the community treasury. Every sell is free. This asymmetry attracts traders while funding the people who build around the token.
          </p>
        </section>

        {/* 7. Community */}
        <section id="community" style={{ paddingTop: "64px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.9rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "20px" }}>
            7. Community
          </h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>
            LibertyTorch is a community token. That means the community — not a team, not a foundation — ultimately owns the direction. Here's how that works in practice:
          </p>

          {[
            ["Open ownership", "No team allocation, no vesting, no悄悄预留. The full float is in the LP at launch. Everyone buys from the same pool."],
            ["Community treasury", "Tax revenue flows to a creator wallet with a public commitment: deploy toward community initiatives."],
            ["No roadmap", "We don't publish a roadmap because we don't want to promise things we can't guarantee. What we build, you'll see."],
            ["Transparent launches", "Tokenomics decisions are public. Tax rates are on-chain and verifiable. The contract is immutable."],
          ].map(([title, desc]) => (
            <div key={String(title)} style={{ marginBottom: "20px" }}>
              <p style={{ color: "#6EE786", fontWeight: 700, fontSize: "1rem", marginBottom: "6px" }}>· {title}</p>
              <p style={{ color: "#DCF5EB", opacity: 0.8, fontSize: "0.95rem", paddingLeft: "16px" }}>{desc}</p>
            </div>
          ))}
        </section>

        {/* 8. FAQ */}
        <section id="faq" style={{ paddingTop: "64px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.9rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "20px" }}>
            8. Frequently Asked Questions
          </h2>

          {[
            ["Is this affiliated with Torch, Robinhood, or the Statue of Liberty?", "No. LibertyTorch is a community project. $LIBERTY is not issued by, endorsed by, or affiliated with Torch, Robinhood Markets, Inc., or the National Park Service."],
            ["Where can I buy $LIBERTY?", "After launch, through any DEX interface that supports Robinhood Chain — or directly through Torch's own trading interface."],
            ["What's the anti-snipe protection?", "Torch applies an 80% tax on the first 15–30 seconds of trading, then normalizes. This protects the launch from bots and front-runners."],
            ["Can the tax rate change?", "No. Buy tax is set at launch and is fixed forever — this is enforced by the Torch contract."],
            ["Where do I get ETH for Robinhood Chain?", "Robinhood Crypto supports ETH purchases. You can also bridge ETH from other networks to Robinhood Chain using an official bridge."],
            ["What's the $TORCH pair?", "$LIBERTY is paired against $TORCH — the native token of the Torch ecosystem. You need $TORCH to buy $LIBERTY directly from the pool."],
            ["What's the dev buy?", "2% of total supply purchased at launch price with no tax. This gives us skin in the game without being a hidden allocation."],
            ["Is there a Telegram or Twitter?", "Coming at launch. Join the waitlist to be notified."],
          ].map(([q, a]) => (
            <div key={String(q)} style={{ marginBottom: "24px" }}>
              <p style={{ color: "#F7FFFB", fontWeight: 700, fontSize: "1rem", marginBottom: "8px" }}>{q}</p>
              <p style={{ color: "#DCF5EB", opacity: 0.8, fontSize: "0.95rem", lineHeight: 1.7, paddingLeft: "16px", borderLeft: "2px solid #3F6466" }}>{a}</p>
            </div>
          ))}
        </section>

        {/* 9. Risk Disclosure */}
        <section id="risks" style={{ paddingTop: "64px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.9rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "20px" }}>
            9. Risk Disclosure
          </h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "24px" }}>
            LibertyTorch is a community token on an emerging blockchain. There are real risks. Do your own research.
          </p>

          {[
            ["Smart contract risk", "Although Torch's contracts are audited and immutable, always exercise caution with any on-chain interaction."],
            ["Robinhood Chain risk", "Robinhood Chain is a newer network. Liquidity, tooling, and ecosystem depth may be lower than established chains."],
            ["Token price risk", "$LIBERTY may have low liquidity at launch. Do not invest more than you can afford to lose."],
            ["Regulatory risk", "Community tokens may attract regulatory attention depending on your jurisdiction. Know your local laws."],
            ["No financial advice", "Nothing in this whitepaper is financial advice. This is a community project. Always DYOR."],
            ["No refunds", "On-chain transactions are irreversible. There are no refunds."],
          ].map(([risk, desc]) => (
            <div key={String(risk)} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "16px", marginBottom: "16px", fontSize: "0.95rem" }}>
              <span style={{ color: "#6EE786", fontWeight: 700 }}>{risk}</span>
              <span style={{ color: "#DCF5EB", opacity: 0.8 }}>{desc}</span>
            </div>
          ))}
        </section>

        {/* DISCLAIMER */}
        <section style={{ marginTop: "64px", padding: "28px", background: "#174C4F", borderRadius: "16px", border: "1px solid #3F6466" }}>
          <p style={{ fontSize: "0.85rem", color: "#DCF5EB", opacity: 0.7, lineHeight: 1.7 }}>
            <strong style={{ color: "#F7FFFB" }}>Disclaimer:</strong> $LIBERTY is a community token. It is not a security, commodity, or investment contract. This whitepaper does not constitute an offer to sell or solicitation to buy any security. LibertyTorch is not affiliated with, endorsed by, or connected to Torch, Robinhood Markets, Inc., the Statue of Liberty National Monument, the National Park Service, or any government entity. All trading happens at your own risk. Past performance is not indicative of future results.
          </p>
        </section>

      </article>

      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid #3F6466",
        padding: "32px 24px",
        textAlign: "center",
        color: "#3F6466",
        fontSize: "0.8rem",
      }}>
        <p>LibertyTorch 🗽🔥 &nbsp;·&nbsp; Built on Robinhood Chain &nbsp;·&nbsp; Powered by Torch</p>
        <p style={{ marginTop: "8px", opacity: 0.5 }}>Not affiliated with Torch, Robinhood, or any token issuer.</p>
      </footer>
    </main>
  );
}
