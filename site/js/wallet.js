/* Lady Liberty: wallet ledger — link secondary wallets, sign to prove control,
   credit dust contributions to your primary $LIBERTY account.
   Rules: $10 min LIBERTY hold, 5 wallet max, $0.50 min dust, 1 entry per wallet per cycle,
   24h cooldown after winning. */
(function () {
  "use strict";

  var C = window.LIBERTY_CONFIG;
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

  // --- State (localStorage-backed for concept preview) ---
  var WALLETS_KEY = "lady-liberty-linked";
  var RULES = C.rules;

  function loadState() {
    try { return JSON.parse(localStorage.getItem(WALLETS_KEY)) || { primary: null, linked: [], lastWin: 0 }; }
    catch (_) { return { primary: null, linked: [], lastWin: 0 }; }
  }

  function saveState(s) {
    try { localStorage.setItem(WALLETS_KEY, JSON.stringify(s)); }
    catch (_) {}
  }

  var state = loadState();

  // --- Entry math ---
  function isHoldingLiberty() {
    // Concept preview: assumes primary connected = holds $LIBERTY
    // At launch: replace with actual balance check
    return !!state.primary;
  }

  function baseEntries() {
    // 1 base entry if holding ≥$10 $LIBERTY
    return isHoldingLiberty() ? 1 : 0;
  }

  function dustEntries() {
    var total = 0;
    state.linked.forEach(function (l) {
      // One entry per qualifying wallet per cycle
      if ((l.contributed || 0) >= RULES.minDustUsdCents) total++;
    });
    return total;
  }

  function totalEntries() {
    return baseEntries() + dustEntries();
  }

  function isInCooldown() {
    if (!state.lastWin) return false;
    return (Date.now() - state.lastWin) < (RULES.cooldownHours * 3600 * 1000);
  }

  function cooldownRemaining() {
    if (!state.lastWin) return 0;
    var ms = RULES.cooldownHours * 3600 * 1000 - (Date.now() - state.lastWin);
    return Math.max(0, ms);
  }

  // --- Wallet connection ---
  function getProvider() {
    if (window.ethereum) return window.ethereum;
    throw new Error("No wallet detected. Install Rabby or MetaMask.");
  }

  function shortAddr(a) {
    return a ? a.slice(0, 6) + "…" + a.slice(-4) : "";
  }

  async function connectPrimary() {
    var prov = getProvider();
    var accounts = await prov.request({ method: "eth_requestAccounts" });
    var addr = accounts[0];
    state.primary = { address: addr, ens: null, linkedAt: Date.now() };
    saveState(state);
    renderLedger();
  }

  async function linkSecondary() {
    if (!state.primary) throw new Error("Connect your main $LIBERTY wallet first.");
    if (state.linked.length >= RULES.maxLinkedWallets) {
      throw new Error("Maximum " + RULES.maxLinkedWallets + " linked wallets. Unlink one before adding another.");
    }

    var prov = getProvider();
    var accounts = await prov.request({ method: "eth_requestAccounts" });
    var secondaryAddr = accounts[0];

    if (secondaryAddr.toLowerCase() === state.primary.address.toLowerCase()) {
      throw new Error("That's your primary wallet. Switch to a different one in your wallet extension and try again.");
    }

    if (state.linked.some(function (l) { return l.address.toLowerCase() === secondaryAddr.toLowerCase(); })) {
      throw new Error("This wallet is already linked.");
    }

    // Sign a proof
    var ts = Date.now();
    var message = (
      "Lady Liberty RWA Raffle\n" +
      "Link wallet: " + secondaryAddr + "\n" +
      "To primary: " + state.primary.address + "\n" +
      "Timestamp: " + ts + "\n\n" +
      "By signing, you prove you control this address. No transaction, no gas."
    );

    var sig = await prov.request({
      method: "personal_sign",
      params: [message, secondaryAddr]
    });

    state.linked.push({
      address: secondaryAddr,
      ens: null,
      linkedAt: ts,
      proof: sig,
      contributed: 0
    });

    saveState(state);
    renderLedger();
  }

  function unlink(addr) {
    state.linked = state.linked.filter(function (l) { return l.address !== addr; });
    saveState(state);
    renderLedger();
  }

  function disconnectPrimary() {
    state.primary = null;
    state.linked = [];
    saveState(state);
    renderLedger();
  }

  // Simulate a dust contribution (concept preview — no real tx)
  function simulateContribution(addr) {
    var linked = state.linked.find(function (l) { return l.address === addr; });
    if (!linked) return;

    var asset = C.exampleAssets[Math.floor(Math.random() * C.exampleAssets.length)];
    var usd = Math.floor(Math.random() * 24500 + 50); // $0.50–$245
    linked.contributed = (linked.contributed || 0) + usd;
    linked.lastAsset = asset.symbol;
    linked.lastUsd = usd;
    linked.lastTime = Date.now();

    var n = dustEntries();
    var msg = "Deposited $" + R.formatUsd(usd) + " in " + asset.symbol + " from " + shortAddr(addr);
    if (usd < RULES.minDustUsdCents) {
      msg += ". Below $" + (RULES.minDustUsdCents / 100).toFixed(2) + " minimum — no entry earned.";
    } else {
      msg += ". 1 dust entry for this wallet this cycle.";
    }

    var p = $(".ledger-toast");
    p.textContent = msg;
    p.classList.add("visible");
    setTimeout(function () { p.classList.remove("visible"); }, 4000);

    saveState(state);
    renderLedger();
  }

  function simulateWin() {
    state.lastWin = Date.now();
    saveState(state);
    renderLedger();
  }

  // --- Render ---
  function renderLedger() {
    var container = $("[data-ledger]");
    if (!container) return;

    var primaryConnected = !!state.primary;
    var base = baseEntries();
    var dust = dustEntries();
    var total = base + dust;
    var inCooldown = isInCooldown();
    var slotsLeft = RULES.maxLinkedWallets - state.linked.length;

    container.innerHTML = "";
    container.className = "ledger" + (primaryConnected ? " is-connected" : "");

    // --- Rules summary card ---
    var rulesCard = el("div", { class: "ledger-card ledger-rules" });
    rulesCard.innerHTML =
      '<div class="ledger-card-header">' +
        '<span class="ledger-icon" aria-hidden="true">📋</span>' +
        '<h3>How Entries Work</h3>' +
      '</div>' +
      '<div class="rules-grid">' +
        '<div class="rules-item"><strong>1 base entry</strong>Hold $' + (RULES.minLibertyUsdCents / 100).toFixed(0) + '+ in $LIBERTY</div>' +
        '<div class="rules-item"><strong>Link wallets</strong>Up to ' + RULES.maxLinkedWallets + ' additional wallets for RWA dust</div>' +
        '<div class="rules-item"><strong>$' + (RULES.minDustUsdCents / 100).toFixed(2) + '+ dust</strong>1 entry per qualifying wallet per cycle</div>' +
        '<div class="rules-item"><strong>Hourly draws</strong>Prize pool must reach $' + (RULES.minPoolUsdCents / 100).toFixed(0) + ' to trigger a drawing</div>' +
        '<div class="rules-item"><strong>' + RULES.cooldownHours + 'h cooldown</strong>Winners excluded for ' + RULES.cooldownHours + ' hours after a win</div>' +
      '</div>';
    container.appendChild(rulesCard);

    // --- Primary wallet card ---
    var primaryCard = el("div", { class: "ledger-card ledger-primary" });
    if (primaryConnected) {
      primaryCard.innerHTML =
        '<div class="ledger-card-header">' +
          '<span class="ledger-icon" aria-hidden="true">🔗</span>' +
          '<h3>Primary Wallet</h3>' +
          '<span class="ledger-badge badge-active">Connected</span>' +
        '</div>' +
        '<div class="ledger-addr">' +
          '<code>' + shortAddr(state.primary.address) + '</code>' +
          '<span class="ledger-copy-hint">Holds $LIBERTY</span>' +
        '</div>' +
        '<div class="ledger-entry-row">' +
          '<span class="entry-stat"><strong>' + base + '</strong> base entry</span>' +
          (inCooldown ? '<span class="entry-stat cooldown">⏳ Cooldown: ' + R.timeAgo(state.lastWin, { suffix: false }) + ' remaining</span>' : '') +
        '</div>' +
        '<div class="ledger-meta">Connected ' + R.timeAgo(state.primary.linkedAt) + '</div>' +
        '<button class="btn btn-outline-sm" data-disconnect type="button">Disconnect</button>';
    } else {
      primaryCard.innerHTML =
        '<div class="ledger-card-header">' +
          '<span class="ledger-icon" aria-hidden="true">🔗</span>' +
          '<h3>Primary Wallet</h3>' +
          '<span class="ledger-badge badge-inactive">Not connected</span>' +
        '</div>' +
        '<p class="ledger-blurb">Connect the wallet that holds your $LIBERTY ($' + (RULES.minLibertyUsdCents / 100).toFixed(0) + '+ required for raffle eligibility). This is your raffle account — all dust contributions from linked wallets credit here. 1 base entry.</p>' +
        '<button class="btn btn-primary" data-connect-primary type="button">Connect Primary Wallet</button>';
    }
    container.appendChild(primaryCard);

    // --- Linked wallets ---
    if (primaryConnected) {
      var linkedCard = el("div", { class: "ledger-card ledger-linked" });
      linkedCard.innerHTML =
        '<div class="ledger-card-header">' +
          '<span class="ledger-icon" aria-hidden="true">📜</span>' +
          '<h3>Linked Wallets</h3>' +
          '<span class="ledger-count">' + state.linked.length + '/' + RULES.maxLinkedWallets + ' linked</span>' +
        '</div>' +
        '<p class="ledger-blurb">Link secondary wallets holding RWA dust. Sign a message to prove control — no gas, no transaction. Every qualifying contribution earns entries toward your primary raffle account.' +
        (slotsLeft > 0 ? ' <strong>' + slotsLeft + ' slot' + (slotsLeft !== 1 ? 's' : '') + ' remaining</strong>.</p>' : '') +
        '<p class="ledger-note">Min contribution: $' + (RULES.minDustUsdCents / 100).toFixed(2) + '. One entry per qualifying wallet per cycle.</p>';

      if (state.linked.length) {
        var list = el("ul", { class: "linked-list" });
        state.linked.forEach(function (l) {
          var item = el("li", { class: "linked-item" });
          var c = l.contributed || 0;
          var dEntries = c >= RULES.minDustUsdCents ? 1 : 0;
          item.innerHTML =
            '<div class="linked-info">' +
              '<code class="linked-addr">' + shortAddr(l.address) + '</code>' +
              '<span class="linked-meta">Proved ' + R.timeAgo(l.linkedAt) + '</span>' +
              '<span class="linked-contrib">$' + R.formatUsd(c) + ' contributed · <strong>' + dEntries + ' dust entr' + (dEntries !== 1 ? 'ies' : 'y') + '</strong></span>' +
            '</div>' +
            '<div class="linked-actions">' +
              '<button class="btn btn-outline-sm" data-contribute="' + l.address + '" type="button">Simulate Deposit</button>' +
              '<button class="btn btn-text-sm" data-unlink="' + l.address + '" type="button" aria-label="Unlink ' + shortAddr(l.address) + '">✕</button>' +
            '</div>';
          list.appendChild(item);
        });
        linkedCard.appendChild(list);
      }

      if (slotsLeft > 0) {
        linkedCard.appendChild(el("div", { class: "ledger-ctas" },
          '<button class="btn btn-primary" data-link-secondary type="button">Link Another Wallet</button>'
        ));
      }

      container.appendChild(linkedCard);

      // --- Entry tally card ---
      var tallyCard = el("div", { class: "ledger-card ledger-tally" });
      tallyCard.innerHTML =
        '<div class="ledger-card-header">' +
          '<span class="ledger-icon" aria-hidden="true">🎫</span>' +
          '<h3>Your Entries</h3>' +
          '<span class="ledger-badge ' + (total > 0 ? 'badge-active' : 'badge-inactive') + '">' + total + ' total</span>' +
        '</div>' +
        '<div class="tally-grid">' +
          '<div class="tally-item"><span class="tally-num">' + base + '</span><span class="tally-label">Base entry</span><span class="tally-help">$' + (RULES.minLibertyUsdCents / 100).toFixed(0) + ' $LIBERTY</span></div>' +
          '<div class="tally-item"><span class="tally-num">' + dust + '</span><span class="tally-label">Dust entries</span><span class="tally-help">From ' + state.linked.length + ' linked wallet' + (state.linked.length !== 1 ? 's' : '') + '</span></div>' +
          '<div class="tally-item"><span class="tally-num">' + total + '</span><span class="tally-label">Total weight</span><span class="tally-help">' + (inCooldown ? '⏳ In 24h cooldown' : '✅ Eligible for next draw') + '</span></div>' +
        '</div>' +
        (state.lastWin ? '<p class="ledger-note">Last win: ' + new Date(state.lastWin).toLocaleString() + '. Cooldown lifts ' + new Date(state.lastWin + RULES.cooldownHours * 3600 * 1000).toLocaleString() + '.</p>' : '') +
        '<button class="btn btn-outline-sm" data-sim-win type="button">Simulate Win (Demo)</button>';
      container.appendChild(tallyCard);

      // --- History card ---
      if (state.linked.some(function (l) { return l.lastTime; })) {
        var history = el("div", { class: "ledger-card ledger-history" });
        history.innerHTML =
          '<div class="ledger-card-header">' +
            '<span class="ledger-icon" aria-hidden="true">📖</span>' +
            '<h3>Contribution History</h3>' +
          '</div>';
        var histTotal = state.linked.reduce(function (s, l) { return s + (l.contributed || 0); }, 0);
        history.innerHTML += '<p class="ledger-total">Total contributed: <strong>$' + R.formatUsd(histTotal) + '</strong> across ' + state.linked.length + ' wallet' + (state.linked.length !== 1 ? 's' : '') + '</p>';

        var histList = el("ul", { class: "history-list" });
        state.linked.filter(function (l) { return l.lastTime; })
          .sort(function (a, b) { return b.lastTime - a.lastTime; })
          .forEach(function (l) {
            var li = el("li", { class: "history-item" });
            li.textContent = "$" + R.formatUsd(l.lastUsd) + " in " + l.lastAsset + " from " + shortAddr(l.address) + " · " + R.timeAgo(l.lastTime);
            histList.appendChild(li);
          });
        history.appendChild(histList);
        container.appendChild(history);
      }
    }

    // --- Event wiring ---
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

    var btnSimWin = $("[data-sim-win]");
    if (btnSimWin) btnSimWin.addEventListener("click", simulateWin);

    $$("[data-unlink]").forEach(function (b) {
      b.addEventListener("click", function () { unlink(b.dataset.unlink); });
    });

    $$("[data-contribute]").forEach(function (b) {
      b.addEventListener("click", function () { simulateContribution(b.dataset.contribute); });
    });

    // Badge wiring
    var badge = $("[data-entries-total]");
    if (badge) { badge.textContent = total; badge.className = "ledger-badge " + (total > 0 ? "badge-active" : "badge-inactive"); }
  }

  function showError(msg) {
    var p = $(".ledger-error");
    if (!p) return;
    p.textContent = msg;
    p.classList.add("visible");
    setTimeout(function () { p.classList.remove("visible"); }, 5000);
  }

  // --- Init ---
  document.addEventListener("DOMContentLoaded", function () {
    renderLedger();

    if (!window.ethereum) {
      var p = $("[data-ledger]");
      if (p) {
        p.innerHTML =
          '<div class="ledger-card">' +
            '<div class="ledger-card-header"><h3>Wallet Ledger</h3></div>' +
            '<p class="ledger-blurb">No wallet extension detected. Install <a href="https://rabby.io" target="_blank" rel="noopener">Rabby</a> or <a href="https://metamask.io" target="_blank" rel="noopener">MetaMask</a> to link wallets. (The Ledger will be functional at launch — this is a concept preview.)</p>' +
          '</div>';
      }
    }
  });

  // Expose for external use
  window.LibertyLedger = {
    getState: function () { return state; },
    totalEntries: totalEntries,
    isInCooldown: isInCooldown,
    addContribution: function (fromAddr, cents, symbol) {
      var linked = state.linked.find(function (l) { return l.address === fromAddr; });
      if (linked) {
        linked.contributed = (linked.contributed || 0) + cents;
        linked.lastUsd = cents;
        linked.lastAsset = symbol;
        linked.lastTime = Date.now();
        saveState(state);
        renderLedger();
      }
    }
  };
})();