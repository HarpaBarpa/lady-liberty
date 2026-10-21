/* LibertyTorch: live on-chain data layer.
   Reads from deployed contracts via ethers.js. Falls back gracefully if not deployed.
   Drop this <script> before app.js. */
(function () {
  "use strict";

  var C = window.LIBERTY_CONFIG;

  // ── Config ────────────────────────────────────────────────────────
  var RPC = C.contracts && C.contracts.RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
  var CHAIN_ID = C.contracts && C.contracts.CHAIN_ID || 4663;
  var TOKEN = C.contracts && C.contracts.LIBERTY_TOKEN || null;
  var VAULT = C.contracts && C.contracts.LIBERTY_VAULT || null;
  var RAFFLE = C.contracts && C.contracts.LIBERTY_RAFFLE || null;
  var LINK_REG = C.contracts && C.contracts.LINK_REGISTRY || null;
  var TORCH = C.contracts && C.contracts.TORCH || "0x000050E18ffa3F8F7aD170Eb9CeF160eb3Ed1111";
  var DEAD_ADDR = "0x000000000000000000000000000000000000dEaD";

  var NOT_DEPLOYED = !TOKEN || TOKEN.startsWith("PENDING")
                  || !VAULT  || VAULT.startsWith("PENDING")
                  || !RAFFLE || RAFFLE.startsWith("PENDING");

  // ── Ethers setup ──────────────────────────────────────────────────
  var provider;
  try { provider = new ethers.BrowserProvider(window.ethereum); } catch (_) {}

  // ── Helpers ────────────────────────────────────────────────────────
  function shortAddr(a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : "—"; }
  function addrLink(addr, explorer) {
    var base = "https://robinhoodchain.com/address/" + (explorer || addr);
    return '<a href="' + base + '" target="_blank" rel="noopener" class="addr-link">' + shortAddr(addr) + '</a>';
  }
  function fmtUsd(cents) {
    if (cents == null) return "—";
    var neg = cents < 0; var c = Math.abs(cents);
    var d = Math.floor(c / 100);
    var r = c % 100;
    return (neg ? "-$" : "$") + d.toLocaleString("en-US") + "." + (r < 10 ? "0" : "") + r;
  }
  function fmtEth(wei) {
    if (wei == null) return "—";
    var eth = Number(ethers.formatEther(wei));
    if (eth === 0) return "0 ETH";
    if (eth < 0.0001) return "<0.0001 ETH";
    return eth.toFixed(4) + " ETH";
  }
  function fmtTokens(raw, decimals) {
    if (raw == null) return "—";
    decimals = decimals || 18;
    var d = Number(decimals);
    var whole = Math.floor(Number(raw) / Math.pow(10, d));
    var frac = Number(raw) % Math.pow(10, d);
    var fracStr = frac.toString().padStart(d, "0").replace(/0+$/, "");
    return (whole + (fracStr ? "." + fracStr : "")).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function fmtTimeUntil(seconds) {
    if (!seconds || seconds <= 0) return "Now";
    var m = Math.floor(seconds / 60);
    var h = Math.floor(m / 60);
    var s = Math.floor(seconds % 60);
    if (h > 0) return h + "h " + (m % 60) + "m";
    if (m > 0) return m + "m " + s + "s";
    return s + "s";
  }

  // ── ABI fragments ──────────────────────────────────────────────────
  var ERC20_ABI = [
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function name() view returns (string)",
    "function symbol() view returns (string)",
  ];

  var RAFFLE_ABI = [
    "function getPrizePoolCents() view returns (uint256)",
    "function getTimeUntilNextDraw() view returns (uint256)",
    "function raffleId() view returns (uint256)",
    "function lastDrawTime() view returns (uint256)",
    "function drawInterval() view returns (uint256)",
    "function getEligibleAccounts() view returns (address[])",
    "function getWinners(uint256 _raffleId) view returns (address[10])",
    "function cooldownUntil(address) view returns (uint256)",
    "function isInCooldown(address) view returns (bool)",
  ];

  var VAULT_ABI = [
    "function getSupportedTokens() view returns (address[])",
    "function getSupportedTokenCount() view returns (uint256)",
    "function getTokenFeed(address) view returns (address)",
    "function isSupported(address) view returns (bool)",
  ];

  var LINK_ABI = [
    "function isLinkedTo(address,address) view returns (bool)",
    "function getLinkedWalletCount(address) view returns (uint256)",
  ];

  // ── On-chain reader ────────────────────────────────────────────────
  var signer = null;
  var signerAddr = null;

  async function getSigner() {
    if (signer) return signer;
    if (!provider) return null;
    try {
      signer = await provider.getSigner();
      signerAddr = await signer.getAddress();
      return signer;
    } catch (_) { return null; }
  }

  async function readContracts() {
    var s = await getSigner();
    var r = {};
    var vaultContract, raffleContract, tokenContract;

    if (VAULT && !VAULT.startsWith("PENDING")) {
      try {
        vaultContract = new ethers.Contract(VAULT, VAULT_ABI, s || provider);
        var supportedTokens = await vaultContract.getSupportedTokens();
        r.vault = {
          supportedTokens: supportedTokens,
          supportedCount: supportedTokens.length,
        };
        // Fetch per-token price feeds (for off-chain display)
        var tokenData = [];
        for (var i = 0; i < supportedTokens.length; i++) {
          var t = supportedTokens[i];
          try {
            var feed = await vaultContract.getTokenFeed(t);
            tokenData.push({ token: t, feed: feed });
          } catch (_) {}
        }
        r.vault.tokenDetails = tokenData;
      } catch (e) { r.vaultError = e.message; }
    }

    if (RAFFLE && !RAFFLE.startsWith("PENDING")) {
      try {
        raffleContract = new ethers.Contract(RAFFLE, RAFFLE_ABI, s || provider);
        r.raffle = {
          poolCents:    await raffleContract.getPrizePoolCents(),
          untilNext:    await raffleContract.getTimeUntilNextDraw(),
          raffleId:     await raffleContract.raffleId(),
          lastDraw:     await raffleContract.lastDrawTime(),
          interval:     await raffleContract.drawInterval(),
          cooldownOf:  raffleContract.cooldownOf ? null : null,
        };
      } catch (e) { r.raffleError = e.message; }
    }

    if (TOKEN && !TOKEN.startsWith("PENDING")) {
      try {
        tokenContract = new ethers.Contract(TOKEN, ERC20_ABI, s || provider);
        var [total, deadBal, vaultBal] = await Promise.all([
          tokenContract.totalSupply(),
          tokenContract.balanceOf(DEAD_ADDR),
          VAULT && !VAULT.startsWith("PENDING") ? tokenContract.balanceOf(VAULT) : Promise.resolve(null),
        ]);
        r.token = {
          totalSupply: total,
          burned: deadBal,
          vaultBalance: vaultBal,
          symbol: await tokenContract.symbol(),
          name:   await tokenContract.name(),
        };
        // Derived: burned % and circulating
        var totalN = Number(total);
        var burnedN = Number(deadBal);
        r.token.burnPct = totalN > 0 ? (burnedN / totalN * 100).toFixed(2) : "0.00";
        r.token.circulating = totalN - burnedN;
      } catch (e) { r.tokenError = e.message; }
    }

    r.signer = signerAddr;
    r.deployed = !NOT_DEPLOYED;
    return r;
  }

  // ── Expose globally ───────────────────────────────────────────────
  window.LibertyData = {
    read: readContracts,
    NOT_DEPLOYED: NOT_DEPLOYED,
    TOKEN: TOKEN,
    VAULT: VAULT,
    RAFFLE: RAFFLE,
    LINK_REG: LINK_REG,
    TORCH: TORCH,
    DEAD_ADDR: DEAD_ADDR,
    DEPLOYER: signerAddr,
    fmtUsd: fmtUsd,
    fmtEth: fmtEth,
    fmtTokens: fmtTokens,
    fmtTimeUntil: fmtTimeUntil,
    shortAddr: shortAddr,
    addrLink: addrLink,
  };

})();
