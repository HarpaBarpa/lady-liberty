import { ethers } from "ethers";
import * as fs from "fs";

/**
 * LibertyTorch Dust Liquidator
 * ----------------------------
 * This script pulls accumulated dust from the LibertyVault, 
 * swaps it for ETH using a DEX aggregator, and splits the proceeds
 * between the prize pool and the dev wallet.
 */

// Configuration
const RPC_URL = process.env.ROBINHOOD_RPC || "https://rpc.mainnet.chain.robinhood.com";
const PRIVATE_KEY = process.env.TORCH_DEPLOYER_KEY; // Same key that owns the vault
const VAULT_ADDRESS = process.env.LIBERTY_VAULT;
const RAFFLE_ADDRESS = process.env.LIBERTY_RAFFLE;
const DEV_WALLET = process.env.DEV_WALLET; // Where the dev split goes

// The split (e.g. 50/50)
const PRIZE_POOL_BPS = 5000; // 50%
const DEV_WALLET_BPS = 5000; // 50%
const BPS_DENOMINATOR = 10000;

// Minimal ABI to pull dust and fund pool
const VAULT_ABI = [
  "function getSupportedTokens() external view returns (address[])",
  "function withdrawToken(address token, uint256 amount, address to) external"
];
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
];
const RAFFLE_ABI = [
  "function fundPrizePoolETH() external payable"
];

async function main() {
  if (!PRIVATE_KEY || !VAULT_ADDRESS || !RAFFLE_ADDRESS || !DEV_WALLET) {
    console.error("Missing required environment variables (TORCH_DEPLOYER_KEY, LIBERTY_VAULT, LIBERTY_RAFFLE, DEV_WALLET)");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, wallet);
  const raffle = new ethers.Contract(RAFFLE_ADDRESS, RAFFLE_ABI, wallet);

  console.log(`Starting liquidator run as ${wallet.address}`);
  console.log(`Vault: ${VAULT_ADDRESS}`);

  // 1. Identify supported tokens
  const tokens = await vault.getSupportedTokens();
  console.log(`Found ${tokens.length} supported tokens to check.`);

  let totalEthRaised = 0n;

  // 2. Process each token
  for (const tokenAddr of tokens) {
    const token = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
    const symbol = await token.symbol();
    const balance = await token.balanceOf(VAULT_ADDRESS);

    if (balance === 0n) {
      console.log(`[${symbol}] Zero balance, skipping.`);
      continue;
    }

    console.log(`[${symbol}] Withdrawing ${ethers.formatUnits(balance, await token.decimals())} dust from Vault...`);
    
    // Pull dust to the liquidator wallet
    const withdrawTx = await vault.withdrawToken(tokenAddr, balance, wallet.address);
    await withdrawTx.wait();

    // 3. Swap dust for ETH
    // NOTE: In production on Robinhood Chain, this would integrate with 0x API or a specific DEX router
    // to swap `balance` of `tokenAddr` for Native ETH.
    console.log(`[${symbol}] 🔄 Swapping for ETH... (DEX aggregator integration goes here)`);
    
    // Simulated swap result (for the sake of the script structure)
    // const ethReceived = await executeSwap(tokenAddr, balance);
    const ethReceived = 0n; // Replace with actual swap output

    if (ethReceived > 0n) {
      totalEthRaised += ethReceived;
      console.log(`[${symbol}] Swap complete: received ${ethers.formatEther(ethReceived)} ETH`);
    } else {
      console.log(`[${symbol}] Swap yielded 0 ETH (or skipped in dev). Dust held in liquidator wallet.`);
    }
  }

  // 4. Split proceeds if any ETH was raised
  if (totalEthRaised > 0n) {
    const prizeShare = (totalEthRaised * BigInt(PRIZE_POOL_BPS)) / BigInt(BPS_DENOMINATOR);
    const devShare = totalEthRaised - prizeShare;

    console.log(`\nTotal ETH raised: ${ethers.formatEther(totalEthRaised)} ETH`);
    
    if (prizeShare > 0n) {
      console.log(`Sending ${ethers.formatEther(prizeShare)} ETH to Prize Pool...`);
      const fundTx = await raffle.fundPrizePoolETH({ value: prizeShare });
      await fundTx.wait();
    }

    if (devShare > 0n) {
      console.log(`Sending ${ethers.formatEther(devShare)} ETH to Dev Wallet (${DEV_WALLET})...`);
      const devTx = await wallet.sendTransaction({
        to: DEV_WALLET,
        value: devShare
      });
      await devTx.wait();
    }
    
    console.log("Liquidation complete.");
  } else {
    console.log("\nNo ETH raised in this run.");
  }
}

main().catch(console.error);