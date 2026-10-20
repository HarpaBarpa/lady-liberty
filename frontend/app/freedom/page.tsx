import type { Metadata } from "next";
import FreedomApp from "./_components/FreedomApp";

export const metadata: Metadata = {
  title: "Freedom machine | Lady Liberty",
  description:
    "Find small Robinhood Stock Token balances on Robinhood Chain and send the ones you choose to the Lady Liberty raffle vault.",
};

export default function FreedomPage() {
  return <FreedomApp />;
}
