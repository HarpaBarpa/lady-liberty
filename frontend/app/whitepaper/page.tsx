export const metadata = {
  title: "Whitepaper · LibertyTorch",
  description: "$LIBERTY — brand, tokenomics, raffle mechanics, and the flame.",
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
        <p style={{ fontSize: "0.75rem", color: "#6EE786", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>Official Whitepaper v1.1</p>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2.5rem, 6vw, 4rem)", fontWeight: 900, lineHeight: 1.1, color: "#F7FFFB", marginBottom: "24px" }}>LibertyTorch<br /><span style={{ color: "#6EE786" }}>🗽🔥</span></h1>
        <p style={{ fontSize: "1.1rem", color: "#DCF5EB", opacity: 0.7, maxWidth: "560px", margin: "0 auto 16px", lineHeight: 1.6 }}>$LIBERTY is a community token on Torch — built on the Statue of Liberty as its brand and narrative anchor.</p>
        <p style={{ fontSize: "0.8rem", color: "#3F6466" }}>October 2026 &nbsp;·&nbsp; Robinhood Chain &nbsp;·&nbsp; Torch Launchpad</p>
      </header>

      <nav style={{ background: "#174C4F", padding: "32px 24px", borderBottom: "1px solid #3F6466" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <p style={{ fontSize: "0.7rem", color: "#3F6466", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>Contents</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
            {["1 · Abstract","2 · Brand","3 · Technology","4 · Token","5 · Tokenomics","6 · Raffle","7 · Flywheel","8 · Community","9 · FAQ","10 · Risks"].map((label, i) => (
              <span key={i} style={{ color: "#DCF5EB", fontSize: "0.85rem", padding: "4px 0" }}>{label}</span>
            ))}
          </div>
        </div>
      </nav>

      <article style={{ maxWidth: "760px", margin: "0 auto", padding: "0 24px 80px" }}>

        <section id="abstract" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>1. Abstract</h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>LibertyTorch is a community token built on <strong style={{ color: "#6EE786" }}>Torch</strong>, deployed on <strong style={{ color: "#6EE786" }}>Robinhood Chain</strong>. Its brand is Lady Liberty — the Statue of Liberty reimagined as a friendly character, torch raised high, mint green flame burning bright.</p>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>The core utility is a community raffle. The 3% buy tax funds an ETH prize vault. Holding $LIBERTY makes you eligible. Sending dust coins to the vault boosts your entries. Every hour, three winners share the vault.</p>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9 }}>There are no team tokens, no vesting schedules, no hidden allocations. The community owns the float from day one.</p>
        </section>

        <section id="brand" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>2. The Brand — Lady Liberty</h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>Lady Liberty is the Statue of Liberty reimagined as a friendly anime character. She has always stood for something: the tired, the poor, the huddled masses yearning to breathe free. LibertyTorch carries that forward — a token for the underdogs, the overlooked.</p>
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
            {[["Torch Protocol","0.90%","$900"],["$LIBERTY Buyback & Burn","0.50%","$500"],["RWA Raffle Funding","1.35%","$1,350"],["Development / Marketing","0.25%","$250"]].map(([label,tax,rev]) => (
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
              {[["Torch Protocol 0.90%","Keeps the Torch ecosystem running."],["$LIBERTY Buyback & Burn 0.50%","Automated buyback and burn. Deflationary with every trade."],["RWA Raffle Funding 1.35%","Funds the hourly community raffle — LibertyTorch's core utility."],["Development / Marketing 0.25%","Site maintenance, social presence, community growth."]].map(([k,v]) => (
                <p key={String(k)} style={{ fontSize: "0.85rem", marginBottom: "8px" }}><span style={{ color: "#6EE786", fontWeight: 700 }}>· {k} </span><span style={{ color: "#DCF5EB", opacity: 0.75 }}>{v}</span></p>
              ))}
            </div>
          </div>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>Launch preset: <strong style={{ color: "#6EE786" }}>Launch (2.5 ETH)</strong>. "Launch Complete" at 10x = 25 ETH market cap. Dev buy: 2% of supply (~20M tokens) at launch, no tax — skin in the game, not a cash grab.</p>
        </section>

        <section id="raffle" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>6. The Raffle — Hold to Enter</h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "20px" }}>Hold $LIBERTY to be eligible. Send dust coins to boost your entries. Every hour, three winners split the vault.</p>
          <div style={{ background: "#174C4F", borderRadius: "16px", padding: "24px", margin: "16px 0" }}>
            <p style={{ fontSize: "0.7rem", color: "#6EE786", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "16px" }}>Raffle Parameters</p>
            {[["Eligibility","Hold any amount of $LIBERTY"],["Entry boost","Send any ERC-20 token to the vault — USD value (via oracle) increases entry weight"],["Draw frequency","Hourly"],["Winners per draw","3"],["Prize split","1st: 50% · 2nd: 30% · 3rd: 20%"],["Prize currency","ETH — sent directly to winners' wallets"],["Vault funding","1.35% buy tax + dust coin deposits"]].map(([k,v]) => (
              <div key={String(k)} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "16px", marginBottom: "12px", fontSize: "0.9rem" }}>
                <span style={{ color: "#6EE786", fontWeight: 700 }}>{k}</span>
                <span style={{ color: "#DCF5EB", opacity: 0.85 }}>{v}</span>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: "1.05rem", color: "#6EE786", fontWeight: 700, marginBottom: "10px" }}>How to boost your entries</h3>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>Send any amount of any ERC-20 token to the LibertyTorch vault address. The USD value of your deposit is calculated via live oracle pricing — that USD value becomes your entry weight. The more dust you send, the higher your weight. Gas is paid by the project where possible — you should not need to spend ETH to enter.</p>
          <h3 style={{ fontSize: "1.05rem", color: "#6EE786", fontWeight: 700, marginBottom: "10px" }}>Vault funding — two streams</h3>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9 }}><strong style={{ color: "#6EE786" }}>Tax stream:</strong> 1.35% of every $LIBERTY buy automatically flows into the vault — on-chain, every trade. <strong style={{ color: "#6EE786" }}>Dust stream:</strong> deposited tokens are held in the vault, contributing to the pool. More dust = bigger vault = bigger prizes.</p>
        </section>

        <section id="flywheel" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>7. The Flywheel</h2>
          <div style={{ background: "#174C4F", borderRadius: "16px", padding: "24px", margin: "16px 0" }}>
            {[["1","Buyers pay 3% tax","0.90% to Torch, 0.50% buyback, 1.35% vault, 0.25% dev/marketing"],["2","Vault grows","1.35% tax + dust deposits accumulate in the ETH prize vault"],["3","Prizes attract holders","The raffle makes holding $LIBERTY valuable. People buy and hold to be eligible"],["4","Dust depositors boost entries","Users send any token — USD valued via oracle — boosting their entry weight"],["5","Volume compounds","More holders = more community = more trading = more tax = LOOP"]].map(([n,t,d],i) => (
              <div key={n} style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: "14px", marginBottom: i < 4 ? "20px" : "0" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(110,231,134,0.15)", border: "1px solid #6EE786", display: "flex", alignItems: "center", justifyContent: "center", color: "#6EE786", fontWeight: 900, fontSize: "0.9rem", flexShrink: 0 }}>{n}</div>
                <div><p style={{ color: "#F7FFFB", fontWeight: 700, fontSize: "0.95rem", marginBottom: "2px" }}>{t}</p><p style={{ color: "#DCF5EB", opacity: 0.7, fontSize: "0.85rem" }}>{d}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section id="community" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>8. Community</h2>
          <p style={{ fontSize: "1.05rem", color: "#DCF5EB", lineHeight: 1.8, opacity: 0.9, marginBottom: "16px" }}>LibertyTorch is a community token. Direction is community-driven, not team-directed.</p>
          {[["Open ownership","No team allocation, no vesting. The full float is in the LP at launch."],["Transparent tax","3% split is public, on-chain, and verifiable. No hidden cuts."],["No roadmap","We build what makes sense. No promises we cannot keep."],["Dust-first","The raffle accepts any token, any amount. Designed for every wallet size."]].map(([t,d]) => (
            <p key={String(t)} style={{ fontSize: "1rem", marginBottom: "12px" }}><span style={{ color: "#6EE786", fontWeight: 700 }}>· {t}: </span><span style={{ color: "#DCF5EB", opacity: 0.8 }}>{d}</span></p>
          ))}
        </section>

        <section id="faq" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>9. FAQ</h2>
          {[["Is this affiliated with Torch, Robinhood, or the Statue of Liberty?","No. LibertyTorch is a community project. $LIBERTY is not issued by, endorsed by, or affiliated with Torch, Robinhood Markets, Inc., or the National Park Service."],["Where can I buy $LIBERTY?","After launch, through the Torch trading interface or any DEX on Robinhood Chain."],["What's the anti-snipe protection?","Torch applies an 80% tax on the first 15-30 seconds of trading, then normalizes."],["Can the tax rate change?","No. The 3% buy tax is set at launch and fixed forever."],["How do I enter the raffle?","Hold $LIBERTY. To boost your entries, send any ERC-20 token to the LibertyTorch vault address."],["What can I send as dust?","Any ERC-20 token. USD value is calculated via oracle pricing."],["How are winners chosen?","Entry weight = $LIBERTY holdings + USD value of dust deposits. Draw is random, weighted by total score."],["What are prizes paid in?","ETH, sent directly to winning wallets. No conversion, no swap."],["How often are draws?","Hourly. Three winners per draw: 50% / 30% / 20%."],["Where do I get ETH for Robinhood Chain?","Robinhood Crypto supports ETH purchases, or bridge from another network."]].map(([q,a]) => (
            <div key={String(q)} style={{ marginBottom: "20px" }}>
              <p style={{ color: "#F7FFFB", fontWeight: 700, fontSize: "0.95rem", marginBottom: "6px" }}>{q}</p>
              <p style={{ color: "#DCF5EB", opacity: 0.8, fontSize: "0.9rem", lineHeight: 1.6, paddingLeft: "14px", borderLeft: "2px solid #3F6466" }}>{a}</p>
            </div>
          ))}
        </section>

        <section id="risks" style={{ paddingTop: "56px" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.8rem", fontWeight: 900, color: "#F7FFFB", marginBottom: "16px" }}>10. Risk Disclosure</h2>
          {[["Smart contract risk","Torch contracts are immutable and audited, but always exercise caution with any on-chain interaction."],["Robinhood Chain risk","Newer network — liquidity, tooling, and ecosystem depth may be lower than established chains."],["Token price risk","$LIBERTY may have low liquidity at launch. Do not invest more than you can afford to lose."],["Raffle risk","Prize amounts depend entirely on trading volume and dust deposits."],["Regulatory risk","Community tokens may attract regulatory attention depending on jurisdiction."],["No financial advice","Nothing in this whitepaper is financial advice. Always DYOR."],["No refunds","On-chain transactions are irreversible."]].map(([r,d]) => (
            <p key={String(r)} style={{ fontSize: "0.9rem", marginBottom: "10px" }}><span style={{ color: "#6EE786", fontWeight: 700 }}>· {r}: </span><span style={{ color: "#DCF5EB", opacity: 0.8 }}>{d}</span></p>
          ))}
        </section>

        <div style={{ marginTop: "48px", padding: "24px", background: "#174C4F", borderRadius: "12px", border: "1px solid #3F6466" }}>
          <p style={{ fontSize: "0.85rem", color: "#DCF5EB", opacity: 0.7, lineHeight: 1.7 }}><strong style={{ color: "#F7FFFB" }}>Disclaimer:</strong> $LIBERTY is a community token. It is not a security, commodity, or investment contract. This whitepaper does not constitute an offer to sell or solicitation to buy any security. LibertyTorch is not affiliated with, endorsed by, or connected to Torch, Robinhood Markets, Inc., the Statue of Liberty National Monument, the National Park Service, or any government entity. All trading happens at your own risk.</p>
        </div>
      </article>

      <footer style={{ borderTop: "1px solid #3F6466", padding: "32px 24px", textAlign: "center", color: "#3F6466", fontSize: "0.8rem" }}>
        <p>LibertyTorch 🗽🔥 &nbsp;·&nbsp; Built on Robinhood Chain &nbsp;·&nbsp; Powered by Torch</p>
        <p style={{ marginTop: "8px", opacity: 0.5 }}>Not affiliated with Torch, Robinhood, or any token issuer.</p>
      </footer>
    </main>
  );
}
