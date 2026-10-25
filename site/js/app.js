/* Lady Liberty: page behaviour. Reads everything from LIBERTY_CONFIG. */
(function () {
  "use strict";

  var C = window.LIBERTY_CONFIG;
  var R = window.LibertyRules;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  function ordinal(n) {
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function pct(n) { return n + "%"; }

  var rules = C.rules;
  var draft = rules.payoutDraft;
  var draftTotal = R.sum(draft);
  var draftRest = 100 - draftTotal;

  /* Rule text that appears in several places */
  $$("[data-rule='fee']").forEach(function (n) { n.textContent = rules.feeBps / 100 + "%"; });
  $$("[data-rule='interval']").forEach(function (n) { n.textContent = rules.drawIntervalMinutes + " minutes"; });
  $$("[data-rule='winners']").forEach(function (n) { n.textContent = rules.winnersPerRound; });
  $$("[data-rule='network']").forEach(function (n) { n.textContent = rules.network; });
  $$("[data-rule='min-liberty']").forEach(function (n) { n.textContent = String(C.rules.minLibertyTokens); });
  $$("[data-rule='max-wallets']").forEach(function (n) { n.textContent = rules.maxLinkedWallets; });
  $$("[data-rule='min-dust']").forEach(function (n) { n.textContent = (rules.minDustUsdCents / 100).toFixed(2); });
  $$("[data-rule='dust-step']").forEach(function (n) { n.textContent = (rules.dustEntryStepCents / 100).toFixed(2); });
  $$("[data-rule='dust-max']").forEach(function (n) { n.textContent = rules.maxDustEntriesPerWallet; });
  $$("[data-rule='min-pool']").forEach(function (n) { n.textContent = (rules.minPoolUsdCents / 100).toFixed(0); });
  $$("[data-rule='cooldown']").forEach(function (n) { n.textContent = rules.cooldownHours; });

  /* Vault address from config */
  var vaultAddr = C.contracts && C.contracts.LIBERTY_VAULT;
  var vaultAddrEl = $("[data-vault-addr]");
  if (vaultAddrEl && vaultAddr && !vaultAddr.startsWith("PENDING")) {
    vaultAddrEl.textContent = vaultAddr;
  }

  /* Raffle CA — displayed in hero badge */
  var raffleCA = C.contracts && C.contracts.LIBERTY_RAFFLE;
  var caEl = $("[data-ca]");
  if (caEl && raffleCA && !raffleCA.startsWith("PENDING")) {
    caEl.textContent = raffleCA;
  }

  /* Mobile navigation */
  var menuBtn = $(".menu-btn");
  var nav = $("#site-nav");
  function closeMenu(returnFocus) {
    nav.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
    if (returnFocus) menuBtn.focus();
  }
  menuBtn.addEventListener("click", function () {
    var open = menuBtn.getAttribute("aria-expanded") === "true";
    if (open) { closeMenu(false); return; }
    nav.classList.add("is-open");
    menuBtn.setAttribute("aria-expanded", "true");
    var first = $("a", nav);
    if (first) first.focus();
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a") && menuBtn.getAttribute("aria-expanded") === "true") closeMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") closeMenu(true);
  });
  window.matchMedia("(min-width: 1021px)").addEventListener("change", function (m) { if (m.matches) closeMenu(false); });



  /* Supported dust tokens — live on-chain when deployed, illustrative examples pre-launch */
  var chipWrap = $("[data-asset-chips]");
  var assetDetail = $("[data-asset-detail]");
  var assetList = [];
  function shortAddr(a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : "—"; }

  function showAsset(i) {
    var a = assetList[i];
    if (!a) return;
    $$(".chip", chipWrap).forEach(function (c, j) { c.setAttribute("aria-pressed", String(i === j)); });
    assetDetail.innerHTML = "";
    var s = el("strong", null, a.symbol);
    assetDetail.appendChild(s);
    assetDetail.appendChild(document.createTextNode(a.about));
  }

  function renderAssetChips(list) {
    assetList = list || [];
    if (!chipWrap) return;
    chipWrap.innerHTML = "";
    assetList.forEach(function (a, i) {
      var b = el("button", { type: "button", class: "chip", "aria-pressed": "false" });
      b.appendChild(el("span", { class: "chip-sym" }, a.symbol));
      b.appendChild(el("span", { class: "chip-name" }, a.name || a.symbol));
      b.addEventListener("click", function () { showAsset(i); });
      chipWrap.appendChild(b);
    });
    if (assetDetail) assetDetail.textContent = assetList.length ? "Pick an example to see what it represents." : "No token types set yet.";
  }

  renderAssetChips(C.exampleAssets.map(function (a) {
    return { symbol: a.symbol, name: a.name, about: " is an example of " + a.about + ". It's not a real listed token — it's here to show the kinds of assets the vault can accept." };
  }));

  /* The tablet: entry calculator */
  var calcForm = $("[data-calc]");
  var calcInput = $("#calc-amount");
  var calcErr = $("[data-calc-error]");
  var dustEntriesEl = $("[data-dust-entries]");
  var totalEntriesEl = $("[data-total-entries]");
  var winOddsEl = $("[data-win-odds]");

  function renderCalc() {
    var parsed = R.parseUsdToCents(calcInput.value, { minCents: rules.minDustUsdCents, maxCents: C.calculator.maxCents });
    if (!parsed.ok) {
      calcErr.textContent = parsed.error;
      calcInput.setAttribute("aria-invalid", "true");
      if (dustEntriesEl) dustEntriesEl.textContent = "0";
      if (totalEntriesEl) totalEntriesEl.textContent = "1";
      if (winOddsEl) winOddsEl.textContent = "1";
      return;
    }
    calcErr.textContent = "";
    calcInput.removeAttribute("aria-invalid");
    
    // Calculate dust entries: 1 entry per $0.50
    var dustCents = parsed.cents;
    var dustEntries = Math.floor(dustCents / rules.dustEntryStepCents);
    if (dustEntries > rules.maxDustEntriesPerWallet) dustEntries = rules.maxDustEntriesPerWallet;
    
    var totalEntries = 1 + dustEntries; // 1 base + dust
    var winOdds = (totalEntries / 100 * 100).toFixed(0); // out of 100 entries
    
    if (dustEntriesEl) dustEntriesEl.textContent = String(dustEntries);
    if (totalEntriesEl) totalEntriesEl.textContent = String(totalEntries);
    if (winOddsEl) winOddsEl.textContent = winOdds;
  }
  
  calcInput.addEventListener("input", renderCalc);
  calcForm.addEventListener("submit", function (e) { e.preventDefault(); renderCalc(); });
  calcInput.value = "5.00"; // default $5 dust
  renderCalc();

  var carryBtn = $("[data-calc-carry]");
  if (carryBtn) {
    carryBtn.addEventListener("click", function (e) {
      e.preventDefault(); // stop form submission
      var target = $("#torch");
      if (target) target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  }

  /* Payout staircase */
  var stepsWrap = $("[data-split-steps]");
  var splitDetail = $("[data-split-detail]");
  $("[data-split-total]").textContent = draftTotal;
  $("[data-split-rest]").textContent = draftRest;
  var maxPct = Math.max.apply(null, draft);
  function showStep(i) {
    $$(".step", stepsWrap).forEach(function (b, j) { b.setAttribute("aria-pressed", String(i === j)); });
    splitDetail.innerHTML = "";
    var p = document.createElement("p");
    if (i < draft.length) {
      var share = draft[i];
      p.appendChild(el("strong", null, ordinal(i + 1) + " place takes " + pct(share) + " of the ETH prize pool."));
      splitDetail.appendChild(p);
      splitDetail.appendChild(el("p", { class: "fine" }, "Paid in ETH, one prize per wallet. Dust is liquidated to ETH and split into the pool."));
    } else {
      p.appendChild(el("strong", null, "The remaining " + pct(draftRest) + " goes to the Liberty Bell jackpot."));
      splitDetail.appendChild(p);
      splitDetail.appendChild(el("p", { class: "fine" }, "4% of every funded draw rolls into the Liberty Bell — a separate jackpot with 1-in-72 hourly odds."));
    }
  }
  draft.forEach(function (share, i) {
    var b = el("button", { type: "button", class: "step", "aria-pressed": "false", "aria-label": ordinal(i + 1) + " place, " + share + " percent" });
    b.style.setProperty("--h", Math.round((share / maxPct) * 220) + "px");
    b.style.setProperty("--w", Math.max(4, Math.round((share / maxPct) * 100)) + "%");
    b.appendChild(el("span", { class: "step-pct", "aria-hidden": "true" }, pct(share)));
    b.appendChild(el("span", { class: "step-bar", "aria-hidden": "true" }));
    b.appendChild(el("span", { class: "step-rank", "aria-hidden": "true" }, ordinal(i + 1)));
    b.addEventListener("click", function () { showStep(i); });
    stepsWrap.appendChild(b);
  });
  if (draftRest > 0) {
    var g = el("button", { type: "button", class: "step step-ghost", "aria-pressed": "false", "aria-label": "Liberty Bell jackpot, " + draftRest + " percent" });
    g.style.setProperty("--h", Math.round((draftRest / maxPct) * 220) + "px");
    g.style.setProperty("--w", Math.max(4, Math.round((draftRest / maxPct) * 100)) + "%");
    g.appendChild(el("span", { class: "step-pct", "aria-hidden": "true" }, pct(draftRest)));
    g.appendChild(el("span", { class: "step-bar", "aria-hidden": "true" }));
    g.appendChild(el("span", { class: "step-rank", "aria-hidden": "true" }, "Bell"));
    g.addEventListener("click", function () { showStep(draft.length); });
    stepsWrap.appendChild(g);
  }
  showStep(0);

  /* Torch hero tap: native #torch scroll (href="#torch" on the element handles it) */

  /* Live draw display — hooking into LibertyData */
  var drawPoolEl  = $("[data-draw-pool]");
  var drawStateEl = $("[data-draw-state]");
  var drawTimeEl  = $("[data-draw-time]");
  var drawRoundEl = $("[data-draw-round]");
  var drawPartsEl = $("[data-draw-parts]");
  var drawSplitEl = $("[data-draw-split]");

  // Build payout split reference from the draft (bars normalized to max share)
  var maxPctDraft = Math.max.apply(null, draft);
  if (drawSplitEl) {
    draft.forEach(function (share, i) {
      var row = el("div", { class: "split-row" });
      var rank = el("span", { class: "split-rank" }, ordinal(i + 1));
      var bar = el("span", { class: "split-bar" });
      bar.style.setProperty("--w", Math.max(4, Math.round((share / maxPctDraft) * 100)) + "%");
      bar.setAttribute("aria-label", ordinal(i + 1) + " place: " + share + "%");
      var pctEl = el("span", { class: "split-pct" }, pct(share));
      row.appendChild(rank);
      row.appendChild(bar);
      row.appendChild(pctEl);
      drawSplitEl.appendChild(row);
    });
    if (draftRest > 0) {
      var restRow = el("div", { class: "split-row split-row-ghost" });
      restRow.appendChild(el("span", { class: "split-rank" }, "Bell"));
      var restBar = el("span", { class: "split-bar" });
      restBar.style.setProperty("--w", Math.max(4, Math.round((draftRest / maxPctDraft) * 100)) + "%");
      restRow.appendChild(restBar);
      restRow.appendChild(el("span", { class: "split-pct" }, pct(draftRest)));
      drawSplitEl.appendChild(restRow);
    }
  }

  // draw-panel probes hooked into the poll loop below

  /* Launch panel */
  var params = $("[data-params]");
  [
    ["Network", rules.network],
    ["Eligibility", "Hold " + (rules.minLibertyTokens / 1000).toFixed(0) + "k $LIBERTY for 1 base entry"],
    ["Linked wallets", "Up to " + rules.maxLinkedWallets + " secondary wallets for RWA dust"],
    ["Min dust", "$" + (rules.minDustUsdCents / 100).toFixed(2) + " minimum; 1 entry per $" + (rules.dustEntryStepCents / 100).toFixed(2) + " (max " + rules.maxDustEntriesPerWallet + "/wallet)"],
    ["Protocol fee", rules.feeBps / 100 + "% on each deposit"],
    ["Draw interval", "Checked every " + rules.drawIntervalMinutes + " minutes; drawing if pool ≥ $" + (rules.minPoolUsdCents / 100).toFixed(0)],
    ["Winners", rules.winnersPerRound + " per round, one prize per wallet"],
    ["Cooldown", rules.cooldownHours + " hours after winning"],
    ["Buy tax", "3% total → 1.00% Torch / 1.00% buyback & burn / 0.85% raffle / 0.15% dev"],
    ["Volume to trigger", "~$" + (rules.volumePerDrawUsdCents / 100).toFixed(2) + " in buys builds ~$" + (rules.minPoolUsdCents / 100).toFixed(0)],
    ["Payouts", "Paid in ETH — draft split totals " + draftTotal + "% (" + draftRest + "% to the Liberty Bell)"],
    ["Prize rollover", "Unspent funds roll to next hour"],
    ["Wallet", rules.walletConnection]
  ].forEach(function (row) {
    var d = el("div");
    d.appendChild(el("dt", null, row[0]));
    d.appendChild(el("dd", null, row[1]));
    params.appendChild(d);
  });
  /* Live mechanical answers — resolved in the contracts */
  var mech = $("[data-mech]");
  if (mech) {
    [
      "Dust entries last 1 hour — reset each cycle when a new raffle begins",
      "Draws fire with any number of participants (not capped at 10 winners)",
      "Dust valued in USD cents via Chainlink; fractional entries round down",
      "Deposits mid-draw are credited to the next cycle's entry tally",
      "Only established tokens with Chainlink oracle prices qualify as dust — no custom tokens",
      "Terms of Service and Privacy Policy are linked in the footer"
    ].forEach(function (t) { mech.appendChild(el("li", null, t)); });
  }

  /* Aging slider: copper in 1886, patina by now */
  var aging = $("#aging");
  var agingImg = $("[data-aging-img]");
  var agingOut = $("[data-aging-out]");
  function renderAging() {
    var y = parseInt(aging.value, 10);
    var c = Math.max(0, Math.min(1, 1 - (y - 1886) / 34)); // fully green after a few decades
    agingImg.style.filter = "sepia(" + c + ") saturate(" + (1 + c * 1.6).toFixed(2) + ") hue-rotate(" + (-c * 18).toFixed(1) + "deg) brightness(" + (1 - c * 0.08).toFixed(2) + ")";
    var label = c > 0.85 ? "fresh copper" : c > 0.45 ? "starting to turn" : c > 0.05 ? "mostly green" : "full patina";
    agingOut.textContent = y + ": " + label;
  }
  aging.addEventListener("input", renderAging);
  renderAging();

  /* Altimeter */
  var levels = $$("main .lvl[data-ft]");
  var altNums = $$("[data-alt-ft]");
  var altLinks = $$(".alt-track a");
  var navLinks = $$(".nav ul a");
  var ticking = false;
  function updateAlt() {
    ticking = false;
    // Altitude follows the line under the header; the "you are here" level uses mid-screen.
    var line = $(".site-header").getBoundingClientRect().bottom + 2;
    var mid = window.innerHeight * 0.45;
    var ft = 0, current = levels[0];
    for (var i = 0; i < levels.length; i++) {
      var top = levels[i].getBoundingClientRect().top;
      if (top <= mid) current = levels[i];
      if (top <= line) {
        var a = +levels[i].dataset.ft;
        var next = levels[i + 1];
        if (next) {
          var b = +next.dataset.ft;
          var nTop = next.getBoundingClientRect().top;
          var t = Math.max(0, Math.min(1, (line - top) / Math.max(1, nTop - top)));
          ft = a + (b - a) * t;
        } else ft = a;
      }
    }
    var doc = document.documentElement;
    if (window.scrollY + window.innerHeight >= doc.scrollHeight - 4) { ft = +levels[levels.length - 1].dataset.ft; current = levels[levels.length - 1]; }
    var rounded = Math.round(ft);
    altNums.forEach(function (n) { n.textContent = rounded; });
    var id = current.id;
    var order = levels.map(function (l) { return l.id; });
    var idx = order.indexOf(id);
    altLinks.forEach(function (link) {
      var li = order.indexOf(link.dataset.level);
      link.classList.toggle("is-here", li === idx);
      link.classList.toggle("is-passed", li < idx);
      if (li === idx) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
    });
    navLinks.forEach(function (link) {
      var target = link.getAttribute("href").slice(1);
      var on = target === id || (target === "inside" && id === "tablet");
      if (on) link.setAttribute("aria-current", "true"); else link.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(updateAlt); } }, { passive: true });
  window.addEventListener("resize", updateAlt);
  updateAlt();

  /* ── Live on-chain data ─────────────────────────────────── */
  (function () {
    var LIVE = window.LibertyData;
    if (!LIVE) return;

    var POLL_MS = 30000;

    var poolEl      = $("[data-live='pool']");
    var stateEl     = $("[data-live-state-text]");
    var partEl      = $("[data-live='participants']");
    var nextEl      = $("[data-live='next-draw']");
    var raffleEl    = $("[data-live='raffle-id']");
    var burnEl      = $("[data-live='burn-amount']");
    var burnPctEl   = $("[data-live='burn-pct']");
    var burnTotalEl = $("[data-live='total-supply']");
    var burnSecEl   = $("[data-live='burn-section']");
    var vaultAddrEl  = $("[data-vault-addr]");
    var drawPoolEl   = $("[data-draw-pool]");
    var drawStateEl  = $("[data-draw-state]");
    var drawTimeEl   = $("[data-draw-time]");
    var drawRoundEl  = $("[data-draw-round]");
    var drawPartsEl  = $("[data-draw-parts]");
    var stateDot     = $("[data-live-state] .dot");

    function setLive(el, text) { if (el) el.textContent = text; }

    function showError(msg) {
      if (stateEl) setLive(stateEl, msg || "Error reading chain");
      if (stateDot) stateDot.className = "dot";
      if (poolEl) poolEl.classList.add("live-error");
    }

    async function poll() {
      try {
        var data = await LIVE.read();

        /* ── Raffle pool ─── */
        if (data.raffle) {
          var pool = Number(data.raffle.poolCents || 0);
          setLive(poolEl, LIVE.fmtUsd(pool));
          if (poolEl) poolEl.classList.remove("live-error");

          var until = Number(data.raffle.untilNext || 0);
          setLive(nextEl, until > 0 ? LIVE.fmtTimeUntil(until) : "Draw now!");
          setLive(raffleEl, "#" + data.raffle.raffleId);

          var eligibleCount = data.raffle && data.raffle.eligibleAccounts ? data.raffle.eligibleAccounts.length : 0;
          var holdersNeeded = 10;
          var enoughHolders = eligibleCount >= holdersNeeded;

          if (!enoughHolders && eligibleCount > 0) {
            setLive(stateEl, eligibleCount + "/" + holdersNeeded + " eligible holders — need " + (holdersNeeded - eligibleCount) + " more to unlock draws");
            if (stateDot) stateDot.className = "dot dot-copper";
          } else if (!enoughHolders && eligibleCount === 0) {
            setLive(stateEl, "Waiting for " + holdersNeeded + " eligible holders to unlock draws");
            if (stateDot) stateDot.className = "dot dot-copper";
          } else if (pool >= 5000) {
            setLive(stateEl, "Pool funded — draw imminent");
            if (stateDot) stateDot.className = "dot dot-mint";
          } else if (pool > 0) {
            setLive(stateEl, "Accumulating — $" + (pool / 100).toFixed(0) + " so far");
            if (stateDot) stateDot.className = "dot dot-copper";
          } else {
            setLive(stateEl, "Waiting for deposits");
            if (stateDot) stateDot.className = "dot dot-copper";
          }

          /* Torch live-draw panel */
          if (drawPoolEl) {
            setLive(drawPoolEl, LIVE.fmtUsd(pool));
            drawPoolEl.classList.toggle("draw-pool-funded", pool >= 5000);
          }
          if (drawTimeEl) { setLive(drawTimeEl, until > 0 ? LIVE.fmtTimeUntil(until) : "Draw now!"); drawTimeEl.classList.toggle("draw-time-now", until <= 0); }
          if (drawRoundEl) setLive(drawRoundEl, "#" + data.raffle.raffleId);
          if (drawStateEl) {
            var ds2;
            if (!enoughHolders && eligibleCount > 0) {
              ds2 = eligibleCount + "/" + holdersNeeded + " holders — " + (holdersNeeded - eligibleCount) + " more needed";
            } else if (!enoughHolders) {
              ds2 = "Awaiting " + holdersNeeded + " eligible holders";
            } else if (pool >= 5000) {
              ds2 = "Pool funded — draw imminent";
            } else if (pool > 0) {
              ds2 = "Accumulating — next check in " + LIVE.fmtTimeUntil(until || 0);
            } else {
              ds2 = "Waiting for first deposits";
            }
            setLive(drawStateEl, ds2);
          }
        } else if (data.raffleError) {
          showError("Raffle: " + (data.raffleError || "unknown error"));
          if (drawStateEl) setLive(drawStateEl, "Raffle: " + (data.raffleError || "unknown error"));
        }

        /* ── Participants (eligible accounts) ─── */
        if (data.raffle && data.raffle.eligibleAccounts) {
          var pCount = data.raffle.eligibleAccounts.length;
          if (pCount > 0) {
            setLive(partEl, pCount + "/10");
          } else {
            setLive(partEl, "0/10");
          }
        } else if (data.vault && data.vault.supportedCount != null) {
          setLive(partEl, "—");
        }

        /* ── Supported tokens ─── */
        if (data.vault && data.vault.supportedCount != null) {
          if (drawPartsEl) setLive(drawPartsEl, String(data.vault.supportedCount));
          if (data.vault.tokenDetails && data.vault.tokenDetails.length) {
            renderAssetChips(data.vault.tokenDetails.map(function (t) {
              return {
                symbol: t.symbol || shortAddr(t.token),
                name: t.symbol || shortAddr(t.token),
                about: " is a supported dust token on the vault (contract " + t.token + ")."
              };
            }));
          }
        }

        /* ── Token burn ─── */
        if (data.token) {
          if (burnSecEl) burnSecEl.style.display = "";
          var sym = data.token.symbol || "$LIBERTY";
          setLive(burnEl,   LIVE.fmtTokens(data.token.burned, 18) + " " + sym);
          setLive(burnPctEl,  Number(data.token.burnPct || 0).toFixed(2) + "%");
          setLive(burnTotalEl, LIVE.fmtTokens(data.token.totalSupply, 18) + " " + sym);
        } else if (data.tokenError) {
          if (burnSecEl) burnSecEl.style.display = "";
          setLive(burnEl, "—");
          setLive(burnPctEl, "—");
        }

        /* ── Vault address ─── */
        if (vaultAddrEl && LIVE.VAULT && !LIVE.VAULT.startsWith("PENDING")) {
          vaultAddrEl.textContent = LIVE.VAULT;
          vaultAddrEl.onclick = function () {
            navigator.clipboard && navigator.clipboard.writeText(LIVE.VAULT);
          };
        }

      } catch (e) {
        showError("Error: " + (e.message || e));
      }
    }

    poll(); // run immediately
    var pollInterval = setInterval(poll, POLL_MS);
    window.LibertyRefresh = poll;

  })();

  /* ── LibertyTorch Audio ─────────────────────────────────── */
  (function () {
    var audio    = document.getElementById("lt-audio");
    var overlay  = document.getElementById("lt-audio-overlay");
    var muteBtn  = document.getElementById("lt-mute");
    var muteIcon = document.getElementById("lt-mute-icon");
    var soundIcon= document.getElementById("lt-sound-icon");
    var vol     = document.getElementById("lt-vol");
    if (!audio || !overlay || !muteBtn) return;

    var started = false;

    function startAudio() {
      if (started) return;
      started = true;
      audio.muted = false;
      audio.volume = 0.65;
      audio.play().catch(function () {});
      overlay.classList.add("is-played");
      overlay.setAttribute("aria-hidden", "true");
    }

    overlay.addEventListener("click", startAudio);
    overlay.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startAudio(); }
    });

    if (vol) {
      vol.addEventListener("input", function () {
        audio.volume = vol.value / 100;
        vol.style.setProperty("--pct", vol.value + "%");
      });
      vol.style.setProperty("--pct", vol.value + "%");
    }

    muteBtn.addEventListener("click", function () {
      audio.muted = !audio.muted;
      muteBtn.setAttribute("aria-pressed", String(audio.muted));
      muteIcon.style.display = audio.muted ? "none" : "";
      soundIcon.style.display = audio.muted ? "" : "none";
    });
  })();
})();
