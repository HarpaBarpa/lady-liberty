/* Lady Liberty: wallet ledger — real on-chain wallet linking + dust deposits.
   Contracts: LinkRegistry (EIP-712 linking) + LibertyVault (depositDust/notifyDeposit).
   Falls back to an honest "opens at launch" state until contract addresses are set. */
(function () {
  "use strict";

  var C = window.LIBERTY_CONFIG;
  var RULES = C.rules;
  var R = window.LibertyRules;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if (text != null) n.textContent = text;
    return n;
  }
  function shortAddr(a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : ""; }

  var RULES = C.rules;
  var CC = C.contracts || {};
  var CHAIN_ID = CC.CHAIN_ID || 4663;
  var RPC_URL = CC.RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
  var LINK_REG = CC.LINK_REGISTRY;
  var VAULT = CC.LIBERTY_VAULT;
  var RAFFLE = CC.LIBERTY_RAFFLE;

  var NOT_DEPLOYED = false;

  // ── ABI fragments ──────────────────────────────────────────────
  var LINK_ABI = [
    "function linkWallet(address primary, address secondary, uint256 timestamp, bytes sig) external",
    "function unlinkWallet(address primary, address secondary) external",
    "function getLinkedWallets(address primary) view returns (address[])",
    "function getLinkedWalletCount(address primary) view returns (uint256)",
    "function getLinkNonce(address primary) view returns (uint256)",
    "function isLinkedTo(address primary, address secondary) view returns (bool)"
  ];
  var VAULT_ABI = [
    "function depositDust(address primary, address dustToken, uint256 amount) external",
    "function notifyDeposit(address primary, address dustToken) external",
    "function getAccountInfo(address primary) view returns (uint256 dustEntries, uint256 cycleId, uint256 cycleUsdCents)",
    "function getSupportedTokens() view returns (address[])",
    "function isSupported(address token) view returns (bool)"
  ];
  var RAFFLE_ABI = [
    "function getAccountEntries(address account) view returns (uint256)",
    "function isInCooldown(address account) view returns (bool)"
  ];
  var ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ];

  // EIP-712 domain for LinkRegistry ("LibertyTorchLink", version "1")
  var EIP712_NAME = "LibertyTorchLink";
  var EIP712_VERSION = "1";
  var LINK_REQUEST_TYPES = {
    LinkRequest: [
      { name: "primary", type: "address" },
      { name: "secondary", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "timestamp", type: "uint256" }
    ]
  };

  // ── State ──────────────────────────────────────────────────────
  var state = { primary: null, linked: [], supported: [], info: null };

  function getProvider() {
    if (window.ethereum) return window.ethereum;
    throw new Error("No wallet detected. Install Rabby or MetaMask.");
  }

  function getSigner(address) {
    var bp = new ethers.BrowserProvider(getProvider());
    return address ? bp.getSigner(address) : bp.getSigner();
  }

  async function ensureChain() {
    var p = getProvider();
    var hexId = "0x" + CHAIN_ID.toString(16);
    try {
      await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch (e) {
      if (e && e.code === 4902) {
        await p.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: hexId,
            chainName: "Robinhood Chain",
            rpcUrls: [RPC_URL],
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }
          }]
        });
      } else { throw e; }
    }
  }

  async function readChain() {
    var signer = getSigner();
    var addr = await signer.getAddress();
    state.primary = addr;

    var link = new ethers.Contract(LINK_REG, LINK_ABI, signer);
    var vault = new ethers.Contract(VAULT, VAULT_ABI, signer);
    var raffle = new ethers.Contract(RAFFLE, RAFFLE_ABI, signer);

    try { state.linked = await link.getLinkedWallets(addr); } catch (_) { state.linked = []; }
    try { state.supported = await vault.getSupportedTokens(); } catch (_) { state.supported = []; }

    try {
      var ai = await vault.getAccountInfo(addr);
      var total = await raffle.getAccountEntries(addr);
      var cd = await raffle.isInCooldown(addr);
      state.info = { dust: Number(ai[0]), cycleUsd: Number(ai[2]), total: Number(total), cooldown: cd };
    } catch (_) { state.info = null; }
  }

  // ── Actions ────────────────────────────────────────────────────
  async function connectPrimary() {
    await ensureChain();
    var signer = getSigner();
    var addr = await signer.getAddress();
    state.primary = addr;
    await refresh();
  }

  function disconnectPrimary() {
    state.primary = null;
    state.linked = [];
    state.info = null;
    render();
  }

  async function linkSecondary() {
    if (!state.primary) throw new Error("Connect your primary wallet first.");
    if (state.linked.length >= RULES.maxLinkedWallets) {
      throw new Error("Maximum " + RULES.maxLinkedWallets + " linked wallets reached.");
    }
    await ensureChain();
    var p = getProvider();

    // Read the current link nonce for the primary
    var nonce = await (new ethers.Contract(LINK_REG, LINK_ABI, getSigner(state.primary))).getLinkNonce(state.primary);
    var timestamp = BigInt(Math.floor(Date.now() / 1000));

    toast("Switch to the secondary wallet in your extension, then approve the signature request.");
    var accs = await p.request({ method: "eth_requestAccounts" });
    var secondary = accs[0];
    if (secondary.toLowerCase() === state.primary.toLowerCase()) {
      throw new Error("That's still your primary wallet. Switch accounts and try again.");
    }
    if (state.linked.some(function (a) { return a.toLowerCase() === secondary.toLowerCase(); })) {
      throw new Error("This wallet is already linked.");
    }

    // The secondary signs the EIP-712 LinkRequest
    var domain = { name: EIP712_NAME, version: EIP712_VERSION, chainId: CHAIN_ID, verifyingContract: LINK_REG };
    var message = { primary: state.primary, secondary: secondary, nonce: nonce, timestamp: timestamp };
    var sig = await getSigner(secondary).signTypedData(domain, LINK_REQUEST_TYPES, message);

    // Switch back to the primary to submit the transaction
    toast("Now switch back to your primary wallet and approve the transaction.");
    accs = await p.request({ method: "eth_requestAccounts" });
    if (accs[0].toLowerCase() !== state.primary.toLowerCase()) {
      throw new Error("Expected primary wallet " + shortAddr(state.primary) + " but got " + shortAddr(accs[0]) + ".");
    }

    var link = new ethers.Contract(LINK_REG, LINK_ABI, getSigner(state.primary));
    var tx = await link.linkWallet(state.primary, secondary, timestamp, sig);
    await tx.wait();
    await refresh();
  }

  async function unlink(secondary) {
    if (!state.primary) throw new Error("Connect your primary wallet first.");
    var link = new ethers.Contract(LINK_REG, LINK_ABI, getSigner(state.primary));
    var tx = await link.unlinkWallet(state.primary, secondary);
    await tx.wait();
    await refresh();
  }

  async function depositDust(secondary, token, amountRaw) {
    if (!state.primary) throw new Error("Connect your primary wallet first.");
    await ensureChain();
    var p = getProvider();

    toast("Switch to the linked wallet " + shortAddr(secondary) + " and approve the deposit.");
    var accs = await p.request({ method: "eth_requestAccounts" });
    if (accs[0].toLowerCase() !== secondary.toLowerCase()) {
      throw new Error("Switch to the linked wallet " + shortAddr(secondary) + " to deposit its dust.");
    }

    var signer = getSigner(secondary);
    var erc = new ethers.Contract(token, ERC20_ABI, signer);
    var decimals = await erc.decimals();
    var amount = ethers.parseUnits(String(amountRaw).trim(), decimals);

    var vault = new ethers.Contract(VAULT, VAULT_ABI, signer);
    var allowance = await erc.allowance(secondary, VAULT);
    if (allowance < amount) {
      toast("Approve the dust token spend…");
      var atx = await erc.approve(VAULT, amount);
      await atx.wait();
    }
    toast("Confirm the dust deposit…");
    var dtx = await vault.depositDust(state.primary, token, amount);
    await dtx.wait();
    await refresh();
  }

  async function refresh() {
    try { await readChain(); } catch (e) { showError(e.message); }
    render();
  }

  // ── Toast / error ──────────────────────────────────────────────
  function toast(msg) {
    var t = $(".ledger-toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("visible"); }, 6000);
  }
  function showError(msg) {
    var p = $(".ledger-error");
    if (!p) return;
    p.textContent = msg;
    p.classList.add("visible");
    setTimeout(function () { p.classList.remove("visible"); }, 7000);
  }

  // ── Deposit form (inline) ──────────────────────────────────────
  function buildDepositForm(secondary) {
    var wrap = el("div", { class: "deposit-form" });

    var select = el("select", { "aria-label": "Dust token" });
    select.appendChild(el("option", { value: "" }, "Choose token…"));
    state.supported.forEach(function (token) {
      select.appendChild(el("option", { value: token }, shortAddr(token)));
    });

    var input = el("input", { type: "text", inputmode: "decimal", placeholder: "Amount", "aria-label": "Deposit amount" });
    var go = el("button", { type: "button", class: "btn btn-primary" }, "Deposit");

    go.addEventListener("click", function () {
      var token = select.value;
      var amount = input.value;
      if (!token) { showError("Choose a token."); return; }
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { showError("Enter a valid amount."); return; }
      go.disabled = true;
      depositDust(secondary, token, amount)
        .catch(function (e) { showError(e.message || "Deposit failed"); })
        .finally(function () { go.disabled = false; });
    });

    wrap.appendChild(select);
    wrap.appendChild(input);
    wrap.appendChild(go);
    return wrap;
  }

  // ── Render ─────────────────────────────────────────────────────
  function render() {
    var container = $("[data-ledger]");
    if (!container) return;
    container.innerHTML = "";
    container.className = "ledger";

    // Rules card
    var rulesCard = el("div", { class: "ledger-card ledger-rules" });
    rulesCard.innerHTML =
      '<div class="ledger-card-header"><span class="ledger-icon" aria-hidden="true">📋</span><h3>How Entries Work</h3></div>' +
      '<div class="rules-grid">' +
        '<div class="rules-item"><strong>1 base entry</strong>Hold $' + (RULES.minLibertyUsdCents / 100).toFixed(0) + '+ in $LIBERTY</div>' +
        '<div class="rules-item"><strong>Link wallets</strong>Up to ' + RULES.maxLinkedWallets + ' additional wallets</div>' +
        '<div class="rules-item"><strong>1 entry per $' + (RULES.dustEntryStepCents / 100).toFixed(2) + ' dust</strong>Deposited into the vault</div>' +
        '<div class="rules-item"><strong>Max ' + RULES.maxDustEntriesPerWallet + ' entries</strong>Per linked wallet per cycle</div>' +
        '<div class="rules-item"><strong>Hourly draws</strong>Pool must reach $' + (RULES.minPoolUsdCents / 100).toFixed(0) + ' to trigger</div>' +
        '<div class="rules-item"><strong>' + RULES.cooldownHours + 'h cooldown</strong>Winners excluded after a win</div>' +
      '</div>';
    container.appendChild(rulesCard);

    // Primary wallet card
    var primaryCard = el("div", { class: "ledger-card ledger-primary" });
    if (state.primary) {
      primaryCard.innerHTML =
        '<div class="ledger-card-header"><span class="ledger-icon" aria-hidden="true">🔗</span><h3>Primary Wallet</h3><span class="ledger-badge badge-active">Connected</span></div>' +
        '<div class="ledger-addr"><code>' + shortAddr(state.primary) + '</code><span class="ledger-copy-hint">Holds $LIBERTY</span></div>' +
        '<div class="ledger-meta">' + (state.info && state.info.cooldown ? '⏳ In 24h cooldown' : '✅ Eligible for next draw') + '</div>' +
        '<button class="btn btn-outline-sm" data-disconnect type="button">Disconnect</button>';
    } else {
      primaryCard.innerHTML =
        '<div class="ledger-card-header"><span class="ledger-icon" aria-hidden="true">🔗</span><h3>Primary Wallet</h3><span class="ledger-badge badge-inactive">Not connected</span></div>' +
        '<p class="ledger-blurb">Connect the wallet that holds your $LIBERTY ($' + (RULES.minLibertyUsdCents / 100).toFixed(0) + '+ required). This is your raffle account — dust from linked wallets credits here.</p>' +
        '<button class="btn btn-primary" data-connect-primary type="button">Connect Primary Wallet</button>';
    }
    container.appendChild(primaryCard);

    if (state.primary) {
      // Linked wallets card
      var linkedCard = el("div", { class: "ledger-card ledger-linked" });
      linkedCard.innerHTML =
        '<div class="ledger-card-header"><span class="ledger-icon" aria-hidden="true">📜</span><h3>Linked Wallets</h3><span class="ledger-count">' + state.linked.length + '/' + RULES.maxLinkedWallets + ' linked</span></div>' +
        '<p class="ledger-blurb">Link secondary wallets holding dust. Sign an EIP-712 message to prove control — no gas, no transaction. Every $' + (RULES.dustEntryStepCents / 100).toFixed(2) + ' deposited earns 1 entry, up to ' + RULES.maxDustEntriesPerWallet + ' per wallet.</p>';

      if (state.linked.length) {
        var list = el("ul", { class: "linked-list" });
        state.linked.forEach(function (addr) {
          var item = el("li", { class: "linked-item" });
          item.innerHTML =
            '<div class="linked-info"><code class="linked-addr">' + shortAddr(addr) + '</code><span class="linked-meta">Verified on-chain</span></div>' +
            '<div class="linked-actions">' +
              '<button class="btn btn-outline-sm" data-deposit="' + addr + '" type="button">Deposit Dust</button>' +
              '<button class="btn btn-text-sm" data-unlink="' + addr + '" type="button" aria-label="Unlink ' + shortAddr(addr) + '">✕</button>' +
            '</div>';
          list.appendChild(item);
        });
        linkedCard.appendChild(list);
      }

      if (state.linked.length < RULES.maxLinkedWallets) {
        linkedCard.appendChild(el("div", { class: "ledger-ctas" },
          '<button class="btn btn-primary" data-link-secondary type="button">Link Another Wallet</button>'
        ));
      }
      container.appendChild(linkedCard);

      // Entry tally card
      var dust = state.info ? state.info.dust : 0;
      var total = state.info ? state.info.total : (dust + 1);
      var tallyCard = el("div", { class: "ledger-card ledger-tally" });
      tallyCard.innerHTML =
        '<div class="ledger-card-header"><span class="ledger-icon" aria-hidden="true">🎫</span><h3>Your Entries</h3><span class="ledger-badge ' + (total > 0 ? 'badge-active' : 'badge-inactive') + '">' + total + ' total</span></div>' +
        '<div class="tally-grid">' +
          '<div class="tally-item"><span class="tally-num">1</span><span class="tally-label">Base entry</span><span class="tally-help">$' + (RULES.minLibertyUsdCents / 100).toFixed(0) + ' $LIBERTY</span></div>' +
          '<div class="tally-item"><span class="tally-num">' + dust + '</span><span class="tally-label">Dust entries</span><span class="tally-help">From ' + state.linked.length + ' linked wallet' + (state.linked.length !== 1 ? 's' : '') + '</span></div>' +
          '<div class="tally-item"><span class="tally-num">' + total + '</span><span class="tally-label">Total weight</span><span class="tally-help">' + (state.info && state.info.cooldown ? '⏳ In 24h cooldown' : '✅ Eligible for next draw') + '</span></div>' +
        '</div>';
      container.appendChild(tallyCard);
    }

    // Event wiring
    var btnPrimary = $("[data-connect-primary]");
    if (btnPrimary) btnPrimary.addEventListener("click", function () {
      connectPrimary().catch(function (e) { showError(e.message); });
    });

    var btnLink = $("[data-link-secondary]");
    if (btnLink) btnLink.addEventListener("click", function () {
      linkSecondary().catch(function (e) { showError(e.message); });
    });

    var btnDisc = $("[data-disconnect]");
    if (btnDisc) btnDisc.addEventListener("click", disconnectPrimary);

    $$("[data-unlink]").forEach(function (b) {
      b.addEventListener("click", function () {
        unlink(b.dataset.unlink).catch(function (e) { showError(e.message); });
      });
    });

    $$("[data-deposit]").forEach(function (b) {
      b.addEventListener("click", function () {
        var item = b.closest(".linked-item");
        var existing = item && item.querySelector(".deposit-form");
        if (existing) { existing.remove(); return; }
        if (item) item.appendChild(buildDepositForm(b.dataset.deposit));
      });
    });
  }

  // ── Init ───────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    if (!window.ethereum) {
      var p = $("[data-ledger]");
      if (p) p.innerHTML = '<div class="ledger-card"><div class="ledger-card-header"><span class="ledger-icon" aria-hidden="true">🔗</span><h3>Wallet Ledger</h3></div><p class="ledger-blurb">No wallet extension detected. Install <a href="https://rabby.io" target="_blank" rel="noopener">Rabby</a> or <a href="https://metamask.io" target="_blank" rel="noopener">MetaMask</a> to connect your wallet.</p></div>';
      return;
    }
    render();
    getProvider().request({ method: "eth_accounts" }).then(function (accs) {
      if (accs && accs[0]) refresh().catch(function () {});
    }).catch(function () {});
  });

  window.LibertyLedger = { refresh: refresh };
})();
