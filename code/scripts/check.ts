import { ethers } from "hardhat";

/**
 * Quick health check — reads all three contracts and reports live status.
 * No writes, no key in source. Everything comes from env + on-chain reads.
 *
 * Usage:
 *   RAFFLE_ADDR=0x... VAULT_ADDR=0x... npx hardhat run scripts/check.ts --network robinhood
 */
async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.ROBINHOOD_RPC || "https://rpc.mainnet.chain.robinhood.com"
  );
  const [signer] = await ethers.getSigners();
  const deployer = signer.address;

  const bal = await provider.getBalance(deployer);
  console.log("Deployer:", deployer);
  console.log("Balance:", ethers.formatEther(bal), "ETH\n");

  // ── Raffle ──────────────────────────────────────────
  const raffleAddr = process.env.RAFFLE_ADDR;
  if (!raffleAddr) {
    console.log("RAFFLE_ADDR not set — skipping raffle check.");
  } else {
    const raffle = new ethers.Contract(
      raffleAddr,
      [
        "function canDraw() view returns (bool, uint8)",
        "function canCheckJackpot() view returns (bool, uint8)",
        "function getPrizePoolCents() view returns (uint256)",
        "function jackpotPoolCents() view returns (uint256)",
        "function raffleId() view returns (uint256)",
        "function lastDrawTime() view returns (uint256)",
        "function lastJackpotCheckTime() view returns (uint256)",
        "function getEligibleAccounts() view returns (address[])",
        "function owner() view returns (address)",
        "function paused() view returns (bool)",
        "function jackpotTriggered() view returns (bool)",
        "function jackpotWinner() view returns (address)",
      ],
      provider
    );

    const [canDraw, drawStatus] = await raffle.canDraw();
    const [canJackpot, jackpotStatus] = await raffle.canCheckJackpot();
    const poolCents = await raffle.getPrizePoolCents();
    const jackpotCents = await raffle.jackpotPoolCents();
    const raffleId = await raffle.raffleId();
    const owner = await raffle.owner();
    const paused = await raffle.paused();
    const eligible = await raffle.getEligibleAccounts();
    const jackpotTriggered = await raffle.jackpotTriggered();
    const jackpotWinner = await raffle.jackpotWinner();

    const statusLabel = (s: number) =>
      ["OK", "TooSoon", "BelowFloor", "Paused", "NoAccounts", "WinnerPending"][s] ?? `Unknown(${s})`;

    console.log("── Raffle ──");
    console.log("  Address:       ", raffleAddr);
    console.log("  Owner:         ", owner);
    console.log("  Deployer=Owner:", owner.toLowerCase() === deployer.toLowerCase());
    console.log("  Paused:        ", paused);
    console.log("  Raffle ID:     ", raffleId.toString());
    console.log("  Pool:          $", (Number(poolCents) / 100).toFixed(2));
    console.log("  Bell:          $", (Number(jackpotCents) / 100).toFixed(2));
    console.log("  Eligible:      ", eligible.length);
    console.log("  canDraw:        ", canDraw, `(${statusLabel(Number(drawStatus))})`);
    console.log("  canCheckJackpot:", canJackpot, `(${statusLabel(Number(jackpotStatus))})`);
    if (jackpotTriggered) {
      console.log("  Bell WINNER:   ", jackpotWinner);
    }
  }

  // ── Vault ──────────────────────────────────────────
  const vaultAddr = process.env.VAULT_ADDR;
  if (!vaultAddr) {
    console.log("\nVAULT_ADDR not set — skipping vault check.");
  } else {
    const vault = new ethers.Contract(
      vaultAddr,
      [
        "function getSupportedTokens() view returns (address[])",
        "function getSupportedTokenCount() view returns (uint256)",
        "function owner() view returns (address)",
      ],
      provider
    );

    const [tokens, tokenCount, owner] = await Promise.all([
      vault.getSupportedTokens(),
      vault.getSupportedTokenCount(),
      vault.owner(),
    ]);

    console.log("\n── Vault ──");
    console.log("  Address:         ", vaultAddr);
    console.log("  Owner:           ", owner);
    console.log("  Supported tokens: ", tokenCount.toString());
    for (const t of tokens) {
      console.log("    ", t);
    }
  }

  // ── LinkRegistry ───────────────────────────────────
  const linkRegAddr = process.env.LINK_REG_ADDR;
  if (!linkRegAddr) {
    console.log("\nLINK_REG_ADDR not set — skipping LinkRegistry check.");
  } else {
    const linkReg = new ethers.Contract(
      linkRegAddr,
      ["function owner() view returns (address)"],
      provider
    );
    const owner = await linkReg.owner();
    console.log("\n── LinkRegistry ──");
    console.log("  Address:       ", linkRegAddr);
    console.log("  Owner:         ", owner);
    console.log("  Deployer=Owner:", owner.toLowerCase() === deployer.toLowerCase());
  }
}

main().catch(console.error);