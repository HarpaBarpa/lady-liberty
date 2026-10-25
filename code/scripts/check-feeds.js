const { ethers } = require("ethers");
const deployments = require("./deployments.json");
const p = new ethers.JsonRpcProvider("https://rpc.mainnet.chain.robinhood.com");

const iface = new ethers.Interface([
  "event PoolFunded(uint256 amountCents, uint256 newTotal, address funder, uint256 timestamp)",
  "event DrawExecuted(uint256 indexed raffleId, uint256 poolCents, address[] winners, uint256 timestamp)",
  "event JackpotFunded(uint256 amount, uint256 newTotal, uint256 timestamp)",
  "event AccountRegistered(address indexed account, uint256 timestamp)",
  "event AccountDeregistered(address indexed account, uint256 timestamp)",
  "event WinnerClaimed(uint256 indexed raffleId, address winner, uint256 prizeCents, address token, uint256 timestamp)"
]);

async function main() {
  const filter = {
    fromBlock: 97830000,
    toBlock: "latest",
    address: deployments.contracts.LibertyRaffle
  };
  const logs = await p.getLogs(filter);
  console.log("Total events: " + logs.length + "\n");

  const byType = {};
  for (const l of logs) {
    try {
      const parsed = iface.parseLog({ topics: l.topics, data: l.data });
      if (parsed) {
        byType[parsed.name] = (byType[parsed.name] || 0) + 1;
      }
    } catch(e) {}
  }

  console.log("=== Events by type ===");
  for (const [name, count] of Object.entries(byType)) {
    console.log("  " + name + ": " + count);
  }

  // Show last 10 events
  console.log("\n=== Last 10 events (most recent) ===");
  const recent = logs.slice(-10);
  for (const l of recent) {
    try {
      const parsed = iface.parseLog({ topics: l.topics, data: l.data });
      if (parsed) {
        const block = await p.getBlock(l.blockNumber);
        const time = new Date(block.timestamp * 1000).toISOString();
        console.log("  [" + time + "] " + parsed.name + ":", JSON.stringify(parsed.args));
      }
    } catch(e) {}
  }

  // Check if any draws fired
  const drawLogs = logs.filter(l => {
    try { return iface.parseLog({ topics: l.topics, data: l.data })?.name === "DrawExecuted"; } catch { return false; }
  });
  console.log("\n=== Draws fired: " + drawLogs.length + " ===");
  for (const l of drawLogs) {
    const parsed = iface.parseLog({ topics: l.topics, data: l.data });
    const block = await p.getBlock(l.blockNumber);
    console.log("  " + new Date(block.timestamp*1000).toISOString() + " | poolCents: " + parsed.args.poolCents.toString() + " | winners: " + parsed.args.winners.length);
  }
}

main().catch(e => console.error(e.message));
