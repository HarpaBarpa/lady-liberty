/* Lady Liberty: wallet ledger — link secondary wallets, sign to prove control,
   credit dust contributions to your primary $LIBERTY account. */
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
  var LS_KEY = "lady-liberty-ledger";
  var WALLETS_KEY = "lady-liberty-linked";

  function loadState() {
    try { return JSON.parse(localStorage.getItem(WALLETS_KEY)) || { primary: null, linked: [] }; }
    catch (_) { return { primary: null, linked: [] }; }
  }

  function saveState(s) {
    try { localStorage.setItem(WALLETS_KEY, JSON.stringify(s)); }
    catch (_) {}
  }

  var state = loadState();

  // --- Wallet connection ---
  function getProvider() {
    if (window.ethereum) return window.ethereum;
    throw new Error("No wallet detected. Install Rabby or MetaMask.");
  }

  function shortAddr(a) {
    return a ? a.slice(0, 6) + "…" + a.slice(-4) : "";
  }

  function shortEns(addr, ens) {
    if (ens) return ens;
    return shortAddr(addr);
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
    var prov = getProvider();

    // Request a fresh connection event — MetaMask may show the same account;
    // user should switch to their secondary wallet in the extension.
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
    var usd = Math.floor(Math.random() * 50000 + 500); // $5–505
    linked.contributed = (linked.contributed || 0) + usd;
    linked.lastAsset = asset.symbol;
    linked.lastUsd = usd;
    linked.lastTime = Date.now();

    // Show a brief toast
    var p = $(".ledger-toast");
    p.textContent = "Contributed $" + R.formatUsd(usd) + " in " + asset.symbol + " from " + shortAddr(addr);
    p.classList.add("visible");
    setTimeout(function () { p.classList.remove("visible"); }, 3000);

    saveState(state);
    renderLedger();
  }

  // --- Render ---
  function renderLedger() {
    var container = $("[data-ledger]");
    if (!container) return;

    var primaryConnected = !!state.primary;

    container.innerHTML = "";
    container.className = "ledger" + (primaryConnected ? " is-connected" : "");

    // Primary wallet card
    var primaryCard = el("div", { class: "ledger-card ledger-primary" });
    if (primaryConnected) {
      primaryCard.innerHTML =
        '<div class="ledger-card-header">' +
          '<span class="ledger-icon" aria-hidden="true">🔗</span>' +
          '<h3>Primary Wallet</h3>' +
          '<span class="ledger-badge badge-active">Active</span>' +
        '</div>' +
        '<div class="ledger-addr">' +
          '<code>' + shortAddr(state.primary.address) + '</code>' +
          '<span class="ledger-copy-hint">Holds $LIBERTY</span>' +
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
        '<p class="ledger-blurb">Connect the wallet that holds your $LIBERTY. This is your raffle account — all dust contributions from your linked wallets will credit here.</p>' +
        '<button class="btn btn-primary" data-connect-primary type="button">Connect Primary Wallet</button>';
    }
    container.appendChild(primaryCard);

    // Linked wallets
    if (primaryConnected) {
      var linkedCard = el("div", { class: "ledger-card ledger-linked" });
      linkedCard.innerHTML =
        '<div class="ledger-card-header">' +
          '<span class="ledger-icon" aria-hidden="true">📜</span>' +
          '<h3>Linked Wallets</h3>' +
          '<span class="ledger-count">' + state.linked.length + ' linked</span>' +
        '</div>' +
        '<p class="ledger-blurb">Link secondary wallets holding RWA dust. Sign a message to prove control — no gas, no transaction. Contributions from linked wallets count toward your primary raffle entry.</p>';

      if (state.linked.length) {
        var list = el("ul", { class: "linked-list" });
        state.linked.forEach(function (l) {
          var item = el("li", { class: "linked-item" });
          item.innerHTML =
            '<div class="linked-info">' +
              '<code class="linked-addr">' + shortAddr(l.address) + '</code>' +
              '<span class="linked-meta">Proved ' + R.timeAgo(l.linkedAt) + '</span>' +
              '<span class="linked-contrib">$' + R.formatUsd(l.contributed || 0) + ' contributed</span>' +
            '</div>' +
            '<div class="linked-actions">' +
              '<button class="btn btn-outline-sm" data-contribute="' + l.address + '" type="button">Simulate Deposit</button>' +
              '<button class="btn btn-text-sm" data-unlink="' + l.address + '" type="button" aria-label="Unlink ' + shortAddr(l.address) + '">✕</button>' +
            '</div>';
          list.appendChild(item);
        });
        linkedCard.appendChild(list);
      }

      linkedCard.appendChild(el("div", { class: "ledger-ctas" },
        '<button class="btn btn-primary" data-link-secondary type="button">Link Another Wallet</button>'
      ));

      container.appendChild(linkedCard);

      // History card
      if (state.linked.some(function (l) { return l.lastTime; })) {
        var history = el("div", { class: "ledger-card ledger-history" });
        history.innerHTML =
          '<div class="ledger-card-header">' +
            '<span class="ledger-icon" aria-hidden="true">📖</span>' +
            '<h3>Participation History</h3>' +
          '</div>';
        var total = state.linked.reduce(function (s, l) { return s + (l.contributed || 0); }, 0);
        history.innerHTML += '<p class="ledger-total">Total credited: <strong>$' + R.formatUsd(total) + '</strong> toward next draw</p>';

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
      b.addEventListener("click", function () { unlink(b.dataset.unlink); });
    });

    $$("[data-contribute]").forEach(function (b) {
      b.addEventListener("click", function () { simulateContribution(b.dataset.contribute); });
    });
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

    // Ensure ethers.js is available (loaded via CDN in index.html)
    if (!window.ethereum) {
      var p = $("[data-ledger]");
      if (p) {
        p.innerHTML =
          '<div class="ledger-card">' +
            '<div class="ledger-card-header">' +
              '<h3>Wallet Ledger</h3>' +
            '</div>' +
            '<p class="ledger-blurb">No wallet extension detected. Install <a href="https://rabby.io" target="_blank" rel="noopener">Rabby</a> or <a href="https://metamask.io" target="_blank" rel="noopener">MetaMask</a> to link wallets. (The Ledger will be functional at launch — this is a concept preview.)</p>' +
          '</div>';
      }
    }
  });

  // Expose for practice-round carry (carries net value from calculator to ledger)
  window.LibertyLedger = {
    getState: function () { return state; },
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