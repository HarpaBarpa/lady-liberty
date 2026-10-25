import type { Metadata, Viewport } from "next";
import FreedomApp from "./_components/FreedomApp";

export const metadata: Metadata = {
  title: "Freedom machine · Lady Liberty",
  description:
    "Find small Robinhood Stock Token balances on Robinhood Chain and send the ones you choose to the Lady Liberty raffle vault.",
  icons: { icon: { url: "/freedom/favicon.svg", type: "image/svg+xml" } },
};

export const viewport: Viewport = { themeColor: "#174C4F" };

// The same three faces as the live site: Fraunces for display, Bricolage Grotesque for text,
// DM Mono for tags and numbers. React hoists this stylesheet into <head>.
const FONTS =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=DM+Mono:wght@400;500&family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..900,0..100,0..1&display=swap";

export default function FreedomPage() {
  return (
    <>
      <link rel="stylesheet" href={FONTS} precedence="default" />
      <FreedomApp />
    </>
  );
}
