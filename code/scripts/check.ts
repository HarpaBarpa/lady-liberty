import { ethers } from "hardhat";

async function main() {
  const provider = new ethers.JsonRpcProvider("https://rpc.mainnet.chain.robinhood.com");
  const wallet = new ethers.Wallet("REDACTED_COMPROMISED_KEY", provider);

  const bal = await provider.getBalance(wallet.address);
  console.log("Deployer:", wallet.address);
  console.log("Balance:", ethers.formatEther(bal), "ETH");

  // Check LinkRegistry
  const linkReg = new ethers.Contract(
    "0x6AeE4702002a768B3e9c626030D8d1370904CCCB",
    ["function owner() view returns (address)"],
    provider
  );
  const regOwner = await linkReg.owner();
  console.log("LinkRegistry owner:", regOwner);
  console.log("Deployer is owner:", regOwner.toLowerCase() === wallet.address.toLowerCase());
}

main().catch(console.error);