// Regenerates the bundled data the /freedom page falls back to.
//
//   node scripts/refresh-freedom-data.mjs                 registry, prices and feeds from the live APIs
//   node scripts/refresh-freedom-data.mjs --csv <file>    registry from a CSV export instead of /rhj/assets
//
// Writes app/freedom/_data/{registry,prices,feeds}.json. Review the diff before committing:
// the registry is the allow-list, so an added or renamed token should be a conscious change.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "freedom", "_data");
const RH = "https://api.robinhood.com";
const RDD = "https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json";
const CHAIN_ID = 4663;

const RPC = "https://rpc.mainnet.chain.robinhood.com";

// Reads a feed's description() on-chain. The directory's display name and the on-chain string
// differ for some feeds ("Robinhood NVDA / USD" vs "RHNVDA / USD"), and the page compares
// against the on-chain one, so that is what gets pinned.
async function onchainDescription(address) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: address, data: "0x7284e416" }, "latest"] }),
  });
  const { result } = await res.json();
  if (!result || result.length < 130) throw new Error(`description() failed for ${address}`);
  const hex = result.slice(2);
  const offset = parseInt(hex.slice(0, 64), 16) * 2;
  const len = parseInt(hex.slice(offset, offset + 64), 16) * 2;
  return Buffer.from(hex.slice(offset + 64, offset + 64 + len), "hex").toString("utf8");
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} answered HTTP ${res.status}`);
  return res.json();
}

function isAddress(a) {
  return typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a);
}

// Splits one CSV line, honouring double-quoted fields such as "Astera Labs, Inc.".
function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function registryFromCsv(file) {
  const lines = (await readFile(file, "utf8")).trim().split(/\r?\n/);
  const header = splitCsvLine(lines.shift());
  const col = (name) => header.findIndex((h) => h.startsWith(name));
  const idx = {
    symbol: col("symbol"),
    name: col("name"),
    address: col("address"),
    chainId: col("chainId"),
    decimals: col("decimals"),
    status: col("status"),
    multiplier: col("currentMultiplier"),
    isin: col("isin"),
  };
  const asOf = (header[idx.multiplier].match(/\d{4}-\d{2}-\d{2}/) || [])[0] || null;
  const tokens = lines
    .map(splitCsvLine)
    .filter((c) => Number(c[idx.chainId]) === CHAIN_ID && c[idx.status] === "ASSET_STATUS_ACTIVE")
    .map((c) => ({
      address: c[idx.address],
      symbol: c[idx.symbol],
      name: c[idx.name],
      decimals: Number(c[idx.decimals]),
      multiplier: c[idx.multiplier],
      isin: c[idx.isin] || undefined,
    }));
  return { asOf, source: `CSV export of ${RH}/rhj/assets`, tokens };
}

async function registryFromApi() {
  const data = await getJson(`${RH}/rhj/assets`);
  const tokens = [];
  for (const a of data.assets || []) {
    if (a.status !== "ASSET_STATUS_ACTIVE") continue;
    const dep = (a.deployments || []).find((d) => d.chainId === CHAIN_ID);
    if (!dep) continue;
    tokens.push({
      address: dep.contractAddress,
      symbol: a.tokenSymbol,
      name: a.tokenName,
      decimals: a.tokenDecimals,
      multiplier: a.currentMultiplier,
      isin: a.isin || undefined,
    });
  }
  return { asOf: new Date().toISOString().slice(0, 10), source: `${RH}/rhj/assets`, tokens };
}

async function main() {
  const csvAt = process.argv.indexOf("--csv");
  const registry = csvAt > 0 ? await registryFromCsv(process.argv[csvAt + 1]) : await registryFromApi();
  for (const t of registry.tokens) {
    if (!isAddress(t.address)) throw new Error(`Bad address for ${t.symbol}: ${t.address}`);
    if (!Number.isInteger(t.decimals)) throw new Error(`Bad decimals for ${t.symbol}`);
  }
  registry.tokens.sort((a, b) => a.symbol.localeCompare(b.symbol));
  const byAddress = new Map(registry.tokens.map((t) => [t.address.toLowerCase(), t]));
  const bySymbol = new Map(registry.tokens.map((t) => [t.symbol, t]));

  // Robinhood quotes are for the raw underlying share, so the app multiplies them by the
  // token's multiplier. Keep only the fields it uses.
  const prices = await getJson(`${RH}/rhj/prices`);
  const quotes = {};
  let generatedAt = null;
  for (const q of prices.quotes || []) {
    const dep = (q.deployments || []).find((d) => d.chainId === CHAIN_ID);
    if (!dep || !byAddress.has(dep.contractAddress.toLowerCase())) continue;
    quotes[dep.contractAddress] = { bid: q.bid, halted: Boolean(q.isTradingHalt) };
    if (!generatedAt || q.generatedAt > generatedAt) generatedAt = q.generatedAt;
  }

  // Chainlink feeds whose price already includes the token multiplier. Only "Robinhood <SYM> / USD"
  // feeds are mapped, and the page also checks each feed's description() on-chain before use.
  const feeds = await getJson(RDD);
  const tokenFeeds = {};
  let ethUsd = null;
  for (const f of feeds) {
    if (f.name === "ETH / USD") {
      ethUsd = { proxy: f.proxyAddress, decimals: f.decimals, heartbeat: f.heartbeat, description: f.name };
      continue;
    }
    const m = /^Robinhood ([A-Z0-9.]+) \/ USD$/.exec(f.name);
    if (!m || f.docs?.productSubType !== "calculatedPrice") continue;
    const token = bySymbol.get(m[1]);
    if (!token || !isAddress(f.proxyAddress)) continue;
    tokenFeeds[token.address] = {
      proxy: f.proxyAddress,
      decimals: f.decimals,
      heartbeat: f.heartbeat,
      description: f.name,
    };
  }
  if (!ethUsd) throw new Error("No ETH / USD feed in the Chainlink directory");
  // Small sequential reads, so the public RPC's rate limit is never an issue.
  for (const feed of [ethUsd, ...Object.values(tokenFeeds)]) {
    const onchain = await onchainDescription(feed.proxy);
    const base = feed.description.replace(/^Robinhood /, "").replace(/ \/ USD$/, "");
    const accepted = [feed.description, `RH${base} / USD`];
    if (!accepted.includes(onchain)) throw new Error(`${feed.proxy} describes itself as "${onchain}", expected ${accepted.join(" or ")}`);
    feed.description = onchain;
  }

  await writeFile(join(OUT, "registry.json"), JSON.stringify(registry, null, 1) + "\n");
  await writeFile(
    join(OUT, "prices.json"),
    JSON.stringify({ generatedAt, source: `${RH}/rhj/prices`, quotes }, null, 1) + "\n",
  );
  await writeFile(
    join(OUT, "feeds.json"),
    JSON.stringify({ asOf: new Date().toISOString().slice(0, 10), source: RDD, ethUsd, tokens: tokenFeeds }, null, 1) + "\n",
  );
  console.log(
    `registry ${registry.tokens.length} tokens (${registry.source}), ` +
      `prices ${Object.keys(quotes).length}, Chainlink token feeds ${Object.keys(tokenFeeds).length}`,
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
