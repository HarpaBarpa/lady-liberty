export const metadata = {
  title: "Whitepaper · LibertyTorch",
  description: "$LIBERTY — brand, tokenomics, raffle mechanics, Liberty Bell jackpot, and the flame.",
};

export default function WhitepaperPage() {
  return (
    <main style={{ background: "#0A1F21", color: "#F7FFFB", minHeight: "100vh" }}>
      <nav style={{ borderBottom: "1px solid #3F6466", padding: "0 24px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(10,31,33,0.95)", backdropFilter: "blur(8px)", zIndex: 100 }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <svg width="38" height="34" viewBox="0 0 64 58" aria-hidden="true"><defs><symbol id="mark" viewBox="0 0 64 58"><path d="M32 2 L34 18 L32 28 L30 18 Z" fill="#B8733A"/><ellipse cx="32" cy="8" rx="14" ry="8" fill="#5FB59B"/><path d="M18 28 Q32 24 46 28 L48 52 Q32 58 16 52 Z" fill="#5FB59B"/><path d="M48 30 Q56 34 52 44 L48 42" fill="#B8733A"/><ellipse cx="54" cy="38" rx="5" ry="8" fill="#6EE786" opacity="0.9"/><path d="M30 18 L24 20 L28 52 L36 52 L40 20 Z" fill="#DCF5EB"/></symbol></defs><use href="#mark" fill="#5FB59B"/></svg>
          <div><span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: "1.1rem", color: "#F7FFFB" }}>Lady Liberty</span><span style={{ display: "block", fontSize: "0.75rem", color: "#3F6466", fontWeight: 600, marginTop: "1px" }}>LIBERTY TORCH</span></div>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a href="/#about" style={{ color: "#DCF5EB", textDecoration: "none", fontSize: "0.9rem" }}>About</a>
          <a href="/#token" style={{ color: "#DCF5EB", textDecoration: "none", fontSize: "0.9rem" }}>Token</a>
          <a href="/whitepaper" style={{ color: "#6EE786", textDecoration: "none", fontSize: "0.9rem", fontWeight: 700 }}>Whitepaper</a>
        </div>
      </nav>

      <header style={{ padding: "80px 24px 60px", textAlign: "center", borderBottom: "1px solid #3F6466" }}>
        <p style={{ fontSize: "0.75rem", color: "#6EE786", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>Official Whitepaper v1.2</p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2.5rem, 6vw, 4rem)", fontWeight: 900, lineHeight: 1.1, color: "#F7FFFB", marginBottom: "24px" }}>LibertyTorch<br /><span style={{ color: "#6EE786" }}>🗽🔥</span></h1>
        <p style={{ fontSize: "1.1rem", color: "#DCF5EB", opacity: 0.7, maxWidth: "560px", margin: "0 auto 16px", lineHeight: 1.6 }}>$LIBERTY is a community token on Torch — built on the Statue of Liberty as its brand and narrative anchor.</p>
        <p style={{ fontSize: "0.8rem", color: "#3F6466" }}>October 2026 &nbsp;·&nbsp; Robinhood Chain &nbsp;·&nbsp; Torch Launchpad</p>
      </header>

      <nav style={{ background: "#174C4F", padding: "32px 24px", borderBottom: "1px solid #3F6466" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <p style={{ fontSize: "0.7rem", color: "#3F6466", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>Contents</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
            {["1 · Abstract","2 · Brand","3 · Technology","4 · Token","5 · Tokenomics","6 · Raffle","7 · Liberty Bell","8 · Flywheel","9 · Community","10 · FAQ","11 · Risks"].map((label, i) => (
              <span key={i} style={{ color: "#DCF5EB", fontSize: "0.85rem", padding: "4px 0" }}>{label}</span>
            ))}
          </div>
        </div>
      </nav>

      <article style={{ maxWidth: "760px", margin: "0 auto", padding: "0 24px 80px" }}>

        <section id="abstract" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>1. Abstract</h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>LibertyTorch is a community token built on <strong style={{ color: "#6EE786" }}>Torch</strong>, deployed on <strong style={{ color: "#6EE786" }}>Robinhood Chain</strong>. Its brand is Lady Liberty — the Statue of Liberty reimagined as a friendly character, torch raised high, mint green flame burning bright.</p>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>The core utility is a weighted hourly raffle. Holding ≥$10 in $LIBERTY earns a base entry. Depositing dust from any ERC-20 token earns bonus entries. Every hour, up to <strong style={{ color: "#6EE786" }}>10 winners</strong> share the ETH prize vault, split 35% / 20% / 12% / 8% / 6% / 5% / 4% / 3% / 2% / 1%.</p>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>There is also the Liberty Bell — a separate jackpot that grows at 4% of every successful draw, triggering independently at 1-in-72 odds per eligible hourly check.</p>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9 }}>There are no team tokens, no vesting schedules, no hidden allocations. The community owns the float from day one.</p>
        </section>

        <section id="brand" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>2. The Brand — Lady Liberty</h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>Lady Liberty is the Statue of Liberty reimagined as a friendly anime character. She has always stood for something: the tired, the poor, the huddled masses yearning to breathe free. LibertyTorch carries that forward — a token for the underdogs, the overlooked, the dust in every wallet.</p>
          <div style={{ background: "#174C4F", borderRadius: "16px", padding: "24px", margin: "20px 0" }}>
            <p style={{ fontSize: "0.7rem", color: "#6EE786", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>Visual Identity</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[["Style","Hand-inked anime editorial illustration"],["Hair","Short sculptural sea-green bob"],["Features","Copper freckles, kind teal eyes"],["Crown","Seven-ray patina crown"],["Attire","Seafoam toga"],["Flame","Mint green #6EE786 — the single light source"],["Palette","Teal · Seafoam · Porcelain · Patina · Copper"]].
                map(([k,v]) => <div key={String(k)} style={{ fontSize: "0.85rem" }}><span style={{ color: "#6EE786", fontWeight: 700 }}>{k}: </span><span style={{ color: "#DCF5EB", opacity: 0.8 }}>{v}</span></div>)}
            </div>
          </div>
        </section>

        <section id="technology" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>3. Technology</h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>Torch is a token launchpad on Robinhood Chain — handles the full token lifecycle in one transaction, no custom Solidity needed. Every Torch token address ends in <strong style={{ color: "#6EE786" }}>1111</strong>. Robinhood Chain is EVM-compatible, uses ETH for gas. Contract is immutable: no owner, no pause, no blacklist, no mint. Liquidity locked forever via Torch launchpad.</p>
          <div style={{ background: "#174C4F", borderRadius: "12px", padding: "20px" }}>
            <p style={{ fontSize: "0.8rem", color: "#6EE786", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>Key Addresses</p>
            {[["$TORCH","0x000050E18ffa3F8F7aD170Eb9CeF160eb3Ed1111"],["Torch Launchpad","0x7891eA889899928aFE637e4Cca8106188427776a"],["$LIBERTY","0x___________1111 (at launch)"],["Explorer","robinhoodchain.io"]].map(([k,v]) => (
              <div key={String(k)} style={{ fontSize: "0.85rem", marginBottom: "6px" }}><span style={{ color: "#6EE786", fontWeight: 700 }}>{k}: </span><span style={{ color: "#DCF5EB", opacity: 0.8, fontFamily: "monospace", wordBreak: "break-all" }}>{v}</span></div>
            ))}
          </div>
        </section>

        <section id="token" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>4. The Token — $LIBERTY</h2>
          <div style={{ background: "#174C4F", borderRadius: "16px", padding: "24px", margin: "16px 0" }}>
            {[["Name","LIBERTY"],["Ticker","$LIBERTY"],["Network","Robinhood Chain"],["Standard","ERC-20"],["Supply","1,000,000,000 (fixed, no mint)"],["Launchpad","Torch (Quick Launch)"]].map(([k,v]) => (
              <div key={String(k)} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "8px", marginBottom: "10px", fontSize: "0.9rem" }}>
                <span style={{ color: "#3F6466", fontWeight: 600 }}>{k}</span>
                <span style={{ color: "#F7FFFB", fontFamily: "monospace" }}>{v}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="tokenomics" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>5. Tokenomics</h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}><strong style={{ color: "#6EE786" }}>Total buy tax: 3.00%</strong> — on every buy, fixed forever. Sell tax: 0% (Torch never taxes sells).</p>
          <div style={{ background: "#174C4F", borderRadius: "16px", padding: "24px", margin: "16px 0" }}>
            <p style={{ fontSize: "0.7rem", color: "#6EE786", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>Tax Breakdown</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px", gap: "8px", fontSize: "0.8rem", color: "#3F6466", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "8px" }}>
              <span>Allocation</span><span style={{ textAlign: "right" }}>Tax</span><span style={{ textAlign: "right" }}>Per $100K</span>
            </div>
            {[["Torch Protocol","1.00%","$1,000"],["$LIBERTY Buyback & Burn","1.00%","$1,000"],["RWA Raffle Funding","0.85%","$850"],["Development / Marketing","0.15%","$150"]].map(([label,tax,rev]) => (
              <div key={String(label)} style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px", gap: "8px", fontSize: "0.9rem", padding: "8px 0", borderBottom: "1px solid rgba(63,100,102,0.5)" }}>
                <span style={{ color: "#DCF5EB" }}>{label}</span>
                <span style={{ color: "#6EE786", fontFamily: "monospace", textAlign: "right" }}>{tax}</span>
                <span style={{ color: "#3F6466", textAlign: "right", fontFamily: "monospace" }}>{rev}</span>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 80px", gap: "8px", fontSize: "0.9rem", padding: "8px 0", fontWeight: 700 }}>
              <span style={{ color: "#F7FFFB" }}>TOTAL</span>
              <span style={{ color: "#F7FFFB", fontFamily: "monospace", textAlign: "right" }}>3.00%</span>
              <span style={{ color: "#F7FFFB", fontFamily: "monospace", textAlign: "right" }}>$3,000</span>
            </div>
            <div style={{ marginTop: "20px" }}>
              {[["Torch Protocol 1.00%","Keeps the Torch ecosystem running."],["$LIBERTY Buyback & Burn 1.00%","Automated buyback and burn. Deflationary with every trade."],["RWA Raffle Funding 0.85%","Funds the hourly community raffle — LibertyTorch's core utility."],["Development / Marketing 0.15%","Site maintenance, social presence, community growth."]].map(([k,v]) => (
                <p key={String(k)} style={{ fontSize: "0.85rem", marginBottom: "8px" }}><span style={{ color: "#6EE786", fontWeight: 700 }}>· {k} </span><span style={{ color: "#DCF5EB", opacity: 0.75 }}>{v}</span></p>
              ))}
            </div>
          </div>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>Launch preset: <strong style={{ color: "#6EE786" }}>Launch (2.5 ETH)</strong>. "Launch Complete" at 10x = 25 ETH market cap. Dev buy: 2% of supply (~20M tokens) at launch, no tax — skin in the game, not a cash grab.</p>
        </section>

        <section id="raffle" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>6. The Raffle — Hold to Enter</h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>Hold ≥$10 in $LIBERTY for your base entry. Deposit dust from any ERC-20 token to earn bonus entries. Every hour, <strong style={{ color: "#6EE786" }}>10 unique winners</strong> split the ETH prize vault.</p>
          <div style={{ background: "#174C4F", borderRadius: "16px", padding: "24px", margin: "16px 0" }}>
            <p style={{ fontSize: "0.7rem", color: "#6EE786", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>Raffle Parameters</p>
            {[
              ["Eligibility","Hold ≥$10 in $LIBERTY (registered by off-chain watcher)"],
              ["Base entry","1 entry per eligible wallet per hour"],
              ["Entry boost","Deposit dust from any ERC-20 token — USD value (via Chainlink oracle) earns bonus entries"],
              ["Dust math","Every $0.50 in USD value = 1 bonus entry. Max 5 bonus entries per linked wallet per cycle"],
              ["Draw frequency","Hourly (when pool ≥ $50)"],
              ["Winners per draw","10 unique wallets"],
              ["Prize split","35% / 20% / 12% / 8% / 6% / 5% / 4% / 3% / 2% / 1%"],
              ["Prize currency","ETH — sent directly to winners' wallets"],
              ["Winner cooldown","24 hours — winners cannot be selected again during this period"],
              ["Min pool","$50 minimum ETH in vault before a draw fires"],
              ["Vault funding","0.85% buy tax accumulates in the ETH prize vault"],
            ].map(([k,v]) => (
              <div key={String(k)} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", marginBottom: "12px", fontSize: "0.9rem" }}>
                <span style={{ color: "#6EE786", fontWeight: 700 }}>{k}</span>
                <span style={{ color: "#DCF5EB", opacity: 0.85 }}>{v}</span>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: "1.05rem", color: "#6EE786", fontWeight: 700, marginBottom: "10px" }}>How to boost your entries</h3>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>Link up to 5 secondary wallets to your primary $LIBERTY wallet using an EIP-712 signature (no gas, no transaction). From each linked wallet, you can deposit any ERC-20 token to the LibertyVault. The USD value of your deposit is calculated via Chainlink oracle pricing, and that USD value is converted into bonus entries at a rate of 1 entry per $0.50. Each linked wallet can earn up to 5 bonus entries per cycle. A 2% protocol fee is deducted from each deposit.</p>
          <h3 style={{ fontSize: "1.05rem", color: "#6EE786", fontWeight: 700, marginBottom: "10px" }}>Registration</h3>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>Because the raffle cannot read $LIBERTY balances on-chain from external wallets, an off-chain watcher monitors wallet balances via RPC and calls <code style={{ fontFamily: "monospace", fontSize: "0.85em", background: "rgba(23,76,79,0.8)", padding: "2px 6px", borderRadius: "4px" }}>registerAccount()</code> / <code style={{ fontFamily: "monospace", fontSize: "0.85em", background: "rgba(23,76,79,0.8)", padding: "2px 6px", borderRadius: "4px" }}>deregisterAccount()</code> automatically when balances cross the $10 threshold.</p>
        </section>

        <section id="bell" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>7. The Liberty Bell — Jackpot</h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>The Liberty Bell is a separate jackpot that grows alongside the regular raffle. It has its own independent trigger — <strong style={{ color: "#6EE786" }}>1-in-72 odds (~1.39%) per eligible hourly check</strong> — and its own growing pool. Any registered holder has a shot at the Bell.</p>
          <div style={{ background: "#174C4F", borderRadius: "16px", padding: "24px", margin: "16px 0" }}>
            <p style={{ fontSize: "0.7rem", color: "#6EE786", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>Liberty Bell Parameters</p>
            {[
              ["Trigger odds","1 in 72 (~1.39%) per eligible hourly check — independent of participant count"],
              ["Trigger condition","Jackpot pool ≥ $50, at least 1 eligible account not in cooldown, not paused"],
              ["Funding","4% of every successful regular draw is added to the Bell pool"],
              ["Winner selection","Weighted random — same weighting as regular raffle (1 base + dust entries)"],
              ["Prize payout","ETH or any ERC-20 via claimJackpotPrize(token)"],
              ["Cooldown","Bell winners share the same 24-hour cooldown as regular raffle winners"],
              ["Odds do not change","The number of participants does not affect your 1-in-72 chance per check"],
            ].map(([k,v]) => (
              <div key={String(k)} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "16px", marginBottom: "12px", fontSize: "0.9rem" }}>
                <span style={{ color: "#6EE786", fontWeight: 700 }}>{k}</span>
                <span style={{ color: "#DCF5EB", opacity: 0.85 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(110,231,134,0.06)", border: "1px solid rgba(110,231,134,0.2)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "1rem", color: "#6EE786", fontWeight: 700, marginBottom: "10px" }}>Bell odds reference</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", fontSize: "0.8rem" }}>
              {[["1 check","1.39%"],["1 day (24 checks)","28.8%"],["3 days","71.3%"],["7 days","95.3%"]].map(([k,v]) => (
                <div key={String(k)} style={{ background: "#174C4F", borderRadius: "8px", padding: "10px" }}>
                  <p style={{ color: "#3F6466", marginBottom: "4px" }}>{k}</p>
                  <p style={{ color: "#6EE786", fontWeight: 700, fontSize: "0.95rem" }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="flywheel" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>8. The Flywheel</h2>
          <div style={{ background: "#174C4F", borderRadius: "16px", padding: "24px", margin: "16px 0" }}>
            {[
              ["1","Buyers pay 3% tax","1.00% to Torch, 1.00% buyback & burn, 0.85% vault, 0.15% dev/marketing"],
              ["2","Vault + Bell grow","0.85% tax flows to the ETH prize vault. 4% of each draw tops up the Liberty Bell"],
              ["3","Raffle makes holding valuable","The hourly draw and the ever-growing Bell give $LIBERTY holders a real reason to hold"],
              ["4","Dust depositors boost entries","Users send any ERC-20 token — USD valued via oracle — boosting their entry weight"],
              ["5","Volume compounds","More holders = more community = more trading = more tax = LOOP"],
            ].map(([n,t,d],i) => (
              <div key={n} style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: "14px", marginBottom: i < 4 ? "20px" : "0" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(110,231,134,0.15)", border: "1px solid #6EE786", display: "flex", alignItems: "center", justifyContent: "center", color: "#6EE786", fontWeight: 900, fontSize: "0.9rem", flexShrink: 0 }}>{n}</div>
                <div><p style={{ color: "#F7FFFB", fontWeight: 700, fontSize: "0.95rem", marginBottom: "2px" }}>{t}</p><p style={{ color: "#DCF5EB", opacity: 0.7, fontSize: "0.85rem" }}>{d}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section id="community" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>9. Community</h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>LibertyTorch is a community token. Direction is community-driven, not team-directed.</p>
          {[
            ["Open ownership","No team allocation, no vesting. The full float is in the LP at launch."],
            ["Transparent tax","3% split is public, on-chain, and verifiable. No hidden cuts."],
            ["No roadmap","We build what makes sense. No promises we cannot keep."],
            ["Dust-first","The raffle accepts any ERC-20 token, any amount. Designed for every wallet size."],
          ].map(([t,d]) => (
            <p key={String(t)} style={{ fontSize: "1rem", marginBottom: "12px" }}><span style={{ color: "#6EE786", fontWeight: 700 }}>· {t}: </span><span style={{ color: "#DCF5EB", opacity: 0.8 }}>{d}</span></p>
          ))}
        </section>

        <section id="faq" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>10. FAQ</h2>
          {[
            ["Is this affiliated with Torch, Robinhood, or the Statue of Liberty?","No. LibertyTorch is a community project. $LIBERTY is not issued by, endorsed by, or affiliated with Torch, Robinhood Markets, Inc., or the National Park Service."],
            ["Where can I buy $LIBERTY?","Through the Torch trading interface or any DEX on Robinhood Chain after launch."],
            ["What's the anti-snipe protection?","Torch applies an 80% tax on the first 15–30 seconds of trading, then normalizes."],
            ["Can the tax rate change?","No. The 3% buy tax is set at launch and fixed forever."],
            ["How do I enter the raffle?","Hold ≥$10 in $LIBERTY. An off-chain watcher automatically registers eligible wallets."],
            ["How do I boost my entries?","Link up to 5 secondary wallets and deposit dust from any ERC-20 token. The USD value of your deposit (via oracle) earns bonus entries at 1 per $0.50. Max 5 bonus entries per linked wallet per cycle."],
            ["What can I send as dust?","Any ERC-20 token. USD value is calculated via Chainlink oracle pricing."],
            ["How are winners chosen?","Entry weight = 1 base + bonus entries from dust deposits. Draw is random, weighted by total score. 10 unique winners per draw."],
            ["What are prizes paid in?","ETH, sent directly to winning wallets. No conversion, no swap."],
            ["How often are draws?","Hourly, when the prize pool has at least $50. 10 winners per draw: 35% / 20% / 12% / 8% / 6% / 5% / 4% / 3% / 2% / 1%."],
            ["What is the Liberty Bell?","A separate jackpot that receives 4% of every successful draw. It triggers independently at 1-in-72 odds per eligible hourly check. Any registered holder has a shot at the Bell — the number of participants does not change the odds."],
            ["What is the winner cooldown?","Winners are excluded from the next draw and the next Bell check for 24 hours. The cooldown is enforced on-chain and shared between the regular raffle and the Liberty Bell."],
            ["Where do I get ETH for Robinhood Chain?","Robinhood Crypto supports ETH purchases, or bridge from another network."],
          ].map(([q,a]) => (
            <div key={String(q)} style={{ marginBottom: "20px" }}>
              <p style={{ color: "#F7FFFB", fontWeight: 700, fontSize: "0.95rem", marginBottom: "6px" }}>{q}</p>
              <p style={{ color: "#DCF5EB", opacity: 0.8, fontSize: "0.9rem", lineHeight: 1.6, paddingLeft: "14px", borderLeft: "2px solid #3F6466" }}>{a}</p>
            </div>
          ))}
        </section>

        <section id="risks" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>11. Risk Disclosure</h2>
          {[
            ["Smart contract risk","The LibertyTorch contracts have been reviewed but not formally audited by a third-party security firm. Always exercise caution with any on-chain interaction."],
            ["Robinhood Chain risk","Newer network — liquidity, tooling, and ecosystem depth may be lower than established chains."],
            ["Token price risk","$LIBERTY may have low liquidity at launch. Do not invest more than you can afford to lose."],
            ["Raffle risk","Prize amounts depend entirely on trading volume. There is no guarantee a draw will fire."],
            ["Randomness risk","Draw winners are selected using pseudorandom on-chain data. This is not provably fair."],
            ["Regulatory risk","Community tokens and blockchain-based raffles may attract regulatory attention depending on jurisdiction."],
            ["No financial advice","Nothing in this whitepaper is financial advice. Always DYOR."],
            ["No refunds","On-chain transactions are irreversible."],
          ].map(([r,d]) => (
            <p key={String(r)} style={{ fontSize: "0.9rem", marginBottom: "10px" }}><span style={{ color: "#6EE786", fontWeight: 700 }}>· {r}: </span><span style={{ color: "#DCF5EB", opacity: 0.8 }}>{d}</span></p>
          ))}
        </section>

        <div style={{ marginTop: "48px", padding: "24px", background: "#174C4F", borderRadius: "12px", border: "1px solid #3F6466" }}>
          <p style={{ fontSize: "0.85rem", color: "#DCF5EB", opacity: 0.7, lineHeight: 1.7 }}><strong style={{ color: "#F7FFFB" }}>Disclaimer:</strong> $LIBERTY is a community token. It is not a security, commodity, or investment contract. This whitepaper does not constitute an offer to sell or solicitation to buy any security. LibertyTorch is not affiliated with, endorsed by, or connected to Torch, Robinhood Markets, Inc., the Statue of Liberty National Monument, the National Park Service, or any government entity. All trading happens at your own risk.</p>
        </div>
      </article>

      <footer style={{ borderTop: "1px solid #3F6466", padding: "32px 24px", textAlign: "center", color: "#3F6466", fontSize: "0.8rem" }}>
        <p>LibertyTorch 🗽🔥 &nbsp;·&nbsp; Built on Robinhood Chain &nbsp;·&nbsp; Powered by Torch</p>
        <p style={{ marginTop: "8px", opacity: 0.5 }}>Not affiliated with Torch, Robinhood, or any token issuer. &nbsp;·&nbsp; <a href="/legal/tos.html" style={{ color: "#3F6466" }}>Terms of Service</a> &nbsp;·&nbsp; <a href="/legal/privacy.html" style={{ color: "#3F6466" }}>Privacy Policy</a></p>
      </footer>
    </main>
  );
}
