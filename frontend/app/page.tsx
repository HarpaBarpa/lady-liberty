"use client";

export default function HomePage() {
  return (
    <main className="min-h-screen" style={{ background: "#0A1F21", color: "#F7FFFB" }}>

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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a href="#about" style={{ color: "#DCF5EB", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>About</a>
          <a href="#token" style={{ color: "#DCF5EB", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>Token</a>
          <a href="#community" style={{ color: "#DCF5EB", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500 }}>Community</a>
          <a
            href="#waitlist"
            style={{
              background: "#6EE786",
              color: "#0A1F21",
              fontWeight: 700,
              fontSize: "0.85rem",
              padding: "8px 18px",
              borderRadius: "999px",
              textDecoration: "none",
            }}
          >
            Join Waitlist
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        padding: "80px 24px 100px",
        textAlign: "center",
        maxWidth: "800px",
        margin: "0 auto",
      }}>
        <div style={{
          display: "inline-block",
          background: "rgba(95,181,155,0.15)",
          border: "1px solid #3F6466",
          borderRadius: "999px",
          padding: "6px 16px",
          fontSize: "0.8rem",
          color: "#DCF5EB",
          marginBottom: "24px",
          fontWeight: 600,
        }}>
          🔥 Launching on Torch · Robinhood Chain
        </div>

        <h1 style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
          fontWeight: 900,
          lineHeight: 1.1,
          marginBottom: "24px",
          color: "#F7FFFB",
          letterSpacing: "-0.02em",
        }}>
          Liberation.<br />
          <span style={{ color: "#6EE786" }}>Second chances.</span><br />
          A new torch.
        </h1>

        <p style={{
          fontSize: "1.15rem",
          color: "#DCF5EB",
          lineHeight: 1.7,
          maxWidth: "560px",
          margin: "0 auto 40px",
          opacity: 0.85,
        }}>
          $LIBERTY is a community token built on Torch. No promises. No roadmap theater. Just a torch, a statue, and a flame that burns for everyone.
        </p>

        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="#waitlist"
            style={{
              background: "#6EE786",
              color: "#0A1F21",
              fontWeight: 800,
              fontSize: "1rem",
              padding: "14px 32px",
              borderRadius: "999px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Get Early Access
          </a>
          <a
            href="#token"
            style={{
              border: "1px solid #3F6466",
              color: "#DCF5EB",
              fontWeight: 600,
              fontSize: "1rem",
              padding: "14px 32px",
              borderRadius: "999px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Learn More
          </a>
        </div>
      </section>

      {/* THE TORCH */}
      <section
        id="about"
        style={{
          background: "#174C4F",
          padding: "80px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <p style={{
            fontSize: "0.75rem",
            color: "#6EE786",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}>
            The Flame
          </p>
          <h2 style={{
            fontFamily: "Georgia, serif",
            fontSize: "clamp(1.8rem, 4vw, 3rem)",
            fontWeight: 900,
            marginBottom: "24px",
            color: "#F7FFFB",
          }}>
            She has held that torch since 1886.
          </h2>
          <p style={{
            fontSize: "1.1rem",
            color: "#DCF5EB",
            lineHeight: 1.8,
            maxWidth: "640px",
            margin: "0 auto",
            opacity: 0.9,
          }}>
            Lady Liberty has always stood for something: the tired, the poor, the huddled masses yearning to breathe free. LibertyTorch carries that forward — a token for the underdogs, the overlooked, the ones holding onto something worth keeping.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginTop: "56px",
          }}>
            {[
              ["🗽", "Lady Liberty", "The statue. The brand. The flame."],
              ["🔥", "Torch", "Built on Torch. Liquidity locked forever."],
              ["💧", "4% Tax", "On buys. Never on sells. Fixed forever."],
              ["🔒", "No Owner", "No mint. No pause. No rug."],
            ].map(([icon, title, desc]) => (
              <div key={String(title)} style={{
                background: "rgba(10,31,33,0.4)",
                border: "1px solid rgba(223,245,235,0.15)",
                borderRadius: "16px",
                padding: "24px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "12px" }}>{icon}</div>
                <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "6px", color: "#F7FFFB" }}>{title}</p>
                <p style={{ fontSize: "0.85rem", color: "#DCF5EB", opacity: 0.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOKENOMICS */}
      <section
        id="token"
        style={{
          padding: "80px 24px",
          background: "#0A1F21",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <p style={{
            fontSize: "0.75rem",
            color: "#6EE786",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "16px",
            textAlign: "center",
          }}>
            The Token
          </p>
          <h2 style={{
            fontFamily: "Georgia, serif",
            fontSize: "clamp(1.8rem, 4vw, 3rem)",
            fontWeight: 900,
            marginBottom: "8px",
            color: "#F7FFFB",
            textAlign: "center",
          }}>
            $LIBERTY
          </h2>
          <p style={{
            textAlign: "center",
            color: "#3F6466",
            fontSize: "0.9rem",
            marginBottom: "48px",
          }}>
            ERC-20 · Robinhood Chain · Torch Launchpad
          </p>

          <div style={{
            background: "#174C4F",
            borderRadius: "20px",
            padding: "32px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "24px",
          }}>
            {[
              ["Supply", "1,000,000,000", "Fixed — no mint"],
              ["Buy Tax", "4%", "Only on buys"],
              ["Sell Tax", "0%", "Torch never taxes sells"],
              ["Liquidity", "Locked Forever", "Via Torch launchpad"],
              ["Pair Asset", "$TORCH", "Fuel the torch"],
              ["Launch Fee", "0.00015 ETH", "~$0.50 USD"],
            ].map(([label, value, sub]) => (
              <div key={String(label)} style={{ textAlign: "center" }}>
                <p style={{ fontSize: "0.7rem", color: "#3F6466", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>{label}</p>
                <p style={{ fontSize: "1.3rem", fontWeight: 800, color: "#6EE786", fontFamily: "monospace" }}>{value}</p>
                <p style={{ fontSize: "0.75rem", color: "#DCF5EB", opacity: 0.6, marginTop: "4px" }}>{sub}</p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: "24px",
            padding: "20px 24px",
            background: "rgba(110,231,134,0.08)",
            border: "1px solid rgba(110,231,134,0.2)",
            borderRadius: "12px",
            textAlign: "center",
          }}>
            <p style={{ fontSize: "0.85rem", color: "#DCF5EB", opacity: 0.8 }}>
              💡 <strong style={{ color: "#6EE786" }}>No dev tax. No team allocation. No vesting.</strong> The community owns the float.
            </p>
          </div>
        </div>
      </section>

      {/* CLIMB THE STATUE */}
      <section style={{
        background: "#174C4F",
        padding: "80px 24px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <p style={{
            fontSize: "0.75rem",
            color: "#6EE786",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}>
            The Concept
          </p>
          <h2 style={{
            fontFamily: "Georgia, serif",
            fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
            fontWeight: 900,
            marginBottom: "24px",
            color: "#F7FFFB",
          }}>
            Climb from the harbor to the torch.
          </h2>
          <p style={{
            fontSize: "1rem",
            color: "#DCF5EB",
            lineHeight: 1.8,
            opacity: 0.85,
            marginBottom: "40px",
          }}>
            The landing page is a climb up the statue — from the harbor at 0 ft to the torch at 305 ft. Every section is a step closer to the light. Concept preview coming soon.
          </p>
          <a
            href="https://github.com/HarpaBarpa/lady-liberty"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              border: "1px solid rgba(223,245,235,0.3)",
              color: "#DCF5EB",
              fontWeight: 600,
              fontSize: "0.9rem",
              padding: "12px 28px",
              borderRadius: "999px",
              textDecoration: "none",
            }}
          >
            View the Concept →
          </a>
        </div>
      </section>

      {/* WAITLIST */}
      <section
        id="waitlist"
        style={{
          padding: "80px 24px",
          background: "#0A1F21",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "500px", margin: "0 auto" }}>
          <p style={{
            fontSize: "0.75rem",
            color: "#6EE786",
            fontWeight: 700,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}>
            Early Access
          </p>
          <h2 style={{
            fontFamily: "Georgia, serif",
            fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
            fontWeight: 900,
            marginBottom: "12px",
            color: "#F7FFFB",
          }}>
            Be first through the door.
          </h2>
          <p style={{
            fontSize: "1rem",
            color: "#DCF5EB",
            opacity: 0.7,
            marginBottom: "40px",
            lineHeight: 1.7,
          }}>
            Get notified the moment $LIBERTY goes live. No spam. Just the signal.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem("email") as HTMLInputElement);
              if (input?.value) {
                alert(`Thanks! We'll reach out to ${input.value} when we launch. 🔥`);
                input.value = "";
              }
            }}
            style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}
          >
            <input
              name="email"
              type="email"
              required
              placeholder="your@email.com"
              style={{
                flex: "1 1 220px",
                background: "#174C4F",
                border: "1px solid #3F6466",
                borderRadius: "999px",
                padding: "14px 20px",
                fontSize: "1rem",
                color: "#F7FFFB",
                outline: "none",
                maxWidth: "300px",
              }}
            />
            <button
              type="submit"
              style={{
                background: "#6EE786",
                color: "#0A1F21",
                fontWeight: 800,
                fontSize: "1rem",
                padding: "14px 28px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Join Waitlist
            </button>
          </form>

          <p style={{ fontSize: "0.75rem", color: "#3F6466", marginTop: "16px" }}>
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* COMMUNITY */}
      <section
        id="community"
        style={{
          padding: "60px 24px",
          background: "#174C4F",
          textAlign: "center",
        }}
      >
        <p style={{
          fontSize: "0.75rem",
          color: "#6EE786",
          fontWeight: 700,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          marginBottom: "16px",
        }}>
          Community
        </p>
        <h2 style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(1.4rem, 3vw, 2rem)",
          fontWeight: 900,
          marginBottom: "24px",
          color: "#F7FFFB",
        }}>
          Find us when we launch.
        </h2>
        <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="#"
            style={{
              border: "1px solid #3F6466",
              color: "#DCF5EB",
              fontWeight: 600,
              fontSize: "0.9rem",
              padding: "10px 22px",
              borderRadius: "999px",
              textDecoration: "none",
            }}
          >
            Twitter / X — coming
          </a>
          <a
            href="#"
            style={{
              border: "1px solid #3F6466",
              color: "#DCF5EB",
              fontWeight: 600,
              fontSize: "0.9rem",
              padding: "10px 22px",
              borderRadius: "999px",
              textDecoration: "none",
            }}
          >
            Telegram — coming
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid #3F6466",
        padding: "32px 24px",
        textAlign: "center",
        color: "#3F6466",
        fontSize: "0.8rem",
      }}>
        <p>
          LibertyTorch 🗽🔥 &nbsp;·&nbsp; Built on Robinhood Chain &nbsp;·&nbsp; Powered by Torch
        </p>
        <p style={{ marginTop: "8px", opacity: 0.5 }}>
          Not affiliated with Torch, Robinhood, or any token issuer.
        </p>
      </footer>
    </main>
  );
}
