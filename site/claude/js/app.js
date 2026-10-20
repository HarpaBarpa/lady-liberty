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

  /* Real vault: always the configured (zero) state */
  $("[data-vault-value]").textContent = R.formatUsd(C.vault.valueCents);
  $("[data-vault-participants]").textContent = C.vault.participants;
  $("[data-vault-deposits]").textContent = C.vault.deposits;
  $("[data-vault-next]").textContent = C.vault.nextDraw;

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

  /* Pigeon quips */
  var spot = $(".pigeon-spot");
  var quip = $("#quip");
  var quipIndex = -1;
  var quipTimer = null;
  spot.addEventListener("click", function () {
    quipIndex = (quipIndex + 1) % C.pigeonQuips.length;
    quip.hidden = false;
    quip.textContent = C.pigeonQuips[quipIndex];
    quip.style.animation = "none";
    void quip.offsetWidth;
    quip.style.animation = "";
    spot.closest(".hero-art").classList.add("has-quip");
    clearTimeout(quipTimer);
    quipTimer = setTimeout(function () { quip.hidden = true; }, 5200);
  });

  /* Example assets */
  var chipWrap = $("[data-asset-chips]");
  var assetDetail = $("[data-asset-detail]");
  function showAsset(i) {
    var a = C.exampleAssets[i];
    $$(".chip", chipWrap).forEach(function (c, j) { c.setAttribute("aria-pressed", String(i === j)); });
    assetDetail.innerHTML = "";
    var s = el("strong", null, a.symbol);
    assetDetail.appendChild(s);
    assetDetail.appendChild(document.createTextNode(" is an example of " + a.about + ". It's here to explain the idea, not because it's on a confirmed list, and the vault holds none of it."));
  }
  C.exampleAssets.forEach(function (a, i) {
    var b = el("button", { type: "button", class: "chip", "aria-pressed": "false" });
    b.appendChild(el("span", { class: "chip-sym" }, a.symbol));
    b.appendChild(el("span", { class: "chip-name" }, a.name));
    b.addEventListener("click", function () { showAsset(i); });
    chipWrap.appendChild(b);
  });
  assetDetail.textContent = "Pick an asset to see what it represents.";

  /* The tablet calculator */
  var calcForm = $("[data-calc]");
  var calcInput = $("#calc-amount");
  var calcErr = $("[data-calc-error]");
  var calcOut = $("[data-calc-out]");
  var calcFee = $("[data-calc-fee]");
  var calcNet = $("[data-calc-net]");
  var calcRoman = $("[data-calc-roman]");
  var calcRomanNote = $("[data-calc-roman-note]");
  var carryBtn = $("[data-calc-carry]");
  var carryAmt = $("[data-calc-carry-amt]");
  var lastNet = R.split(C.calculator.defaultCents, rules.feeBps).net;

  function renderCalc() {
    var parsed = R.parseUsdToCents(calcInput.value, C.calculator);
    if (!parsed.ok) {
      calcErr.textContent = parsed.error;
      calcInput.setAttribute("aria-invalid", "true");
      calcOut.classList.add("is-empty");
      calcFee.textContent = "--";
      calcNet.textContent = "--";
      calcRoman.textContent = "";
      calcRomanNote.textContent = "Nothing to carve yet.";
      carryBtn.disabled = true;
      return;
    }
    var s = R.split(parsed.cents, rules.feeBps);
    lastNet = s.net;
    calcErr.textContent = "";
    calcInput.removeAttribute("aria-invalid");
    calcOut.classList.remove("is-empty");
    calcFee.textContent = R.formatUsd(s.fee);
    calcNet.textContent = R.formatUsd(s.net);
    var whole = Math.floor(s.net / 100);
    var roman = R.toRoman(whole);
    if (roman) {
      calcRoman.textContent = roman;
      calcRomanNote.textContent = s.net % 100 ? "Carved in Roman numerals. Romans didn't do cents." : "Carved in Roman numerals, for the tablet.";
    } else if (whole === 0) {
      calcRoman.textContent = "";
      calcRomanNote.textContent = "Less than one whole dollar. The Romans had no numeral for that.";
    } else {
      calcRoman.textContent = "MMMCMXCIX+";
      calcRomanNote.textContent = "Too big for the tablet. Roman numerals stop at 3,999.";
    }
    carryBtn.disabled = false;
    carryAmt.textContent = R.formatUsd(s.net);
  }
  calcInput.addEventListener("input", renderCalc);
  calcForm.addEventListener("submit", function (e) { e.preventDefault(); renderCalc(); });
  calcInput.value = (C.calculator.defaultCents / 100).toString();
  renderCalc();

  /* Payout staircase */
  var stepsWrap = $("[data-split-steps]");
  var splitDetail = $("[data-split-detail]");
  $("[data-split-total]").textContent = draftTotal;
  $("[data-split-rest]").textContent = draftRest;
  var maxPct = Math.max.apply(null, draft);
  var vaultAmts = C.practice.vault;

  function sliceListFor(p) {
    var ul = el("ul", { class: "slice-list" });
    vaultAmts.forEach(function (v) {
      ul.appendChild(el("li", null, R.formatTokens(R.sliceMicros(v.micros, p)) + " " + v.symbol));
    });
    return ul;
  }
  function showStep(i) {
    $$(".step", stepsWrap).forEach(function (b, j) { b.setAttribute("aria-pressed", String(i === j)); });
    splitDetail.innerHTML = "";
    var p = document.createElement("p");
    if (i < draft.length) {
      var share = draft[i];
      p.innerHTML = "";
      p.appendChild(el("strong", null, ordinal(i + 1) + " place takes " + pct(share) + " of every asset."));
      p.appendChild(document.createTextNode(" With the pretend vault from the practice round, that would be:"));
      splitDetail.appendChild(p);
      splitDetail.appendChild(sliceListFor(share));
      splitDetail.appendChild(el("p", { class: "fine" }, "Paid in kind, one prize per wallet. This explains the split; it doesn't settle anything."));
    } else {
      p.appendChild(el("strong", null, "The last " + pct(draftRest) + " is still to be confirmed."));
      p.appendChild(document.createTextNode(" The reference split adds up to " + draftTotal + "%. Where the remaining " + draftRest + "% goes isn't decided, so it stays visible here instead of being quietly rounded away. In the pretend vault it would be:"));
      splitDetail.appendChild(p);
      splitDetail.appendChild(sliceListFor(draftRest));
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
    var g = el("button", { type: "button", class: "step step-ghost", "aria-pressed": "false", "aria-label": "Remaining " + draftRest + " percent, to be confirmed" });
    g.style.setProperty("--h", Math.round((draftRest / maxPct) * 220) + "px");
    g.style.setProperty("--w", Math.max(4, Math.round((draftRest / maxPct) * 100)) + "%");
    g.appendChild(el("span", { class: "step-pct", "aria-hidden": "true" }, pct(draftRest)));
    g.appendChild(el("span", { class: "step-bar", "aria-hidden": "true" }));
    g.appendChild(el("span", { class: "step-rank", "aria-hidden": "true" }, "TBC"));
    g.addEventListener("click", function () { showStep(draft.length); });
    stepsWrap.appendChild(g);
  }
  showStep(0);

  /* Practice round */
  var pvList = $("[data-pv-list]");
  vaultAmts.forEach(function (v) { pvList.appendChild(el("li", null, R.formatTokens(v.micros) + " " + v.symbol)); });

  var flock = $("[data-flock]");
  var drawBtn = $("[data-draw]");
  var simBtn = $("[data-simulate]");
  var resetBtn = $("[data-reset]");
  var pStatus = $("[data-practice-status]");
  var results = $("[data-results]");
  var resHead = $("[data-results-head]");
  var resBody = $("[data-results-body]");
  var simOut = $("[data-sim-out]");
  var drawing = false;
  var birdEls = [];
  var youEntryEl = null;
  var youIndex = 0;

  function entrants() {
    var list = [{ name: "You", cents: lastNet, you: true }];
    C.practice.pigeons.forEach(function (p) { list.push({ name: p.name, cents: p.cents, you: false }); });
    return list;
  }

  function buildFlock() {
    flock.innerHTML = "";
    birdEls = [];
    entrants().forEach(function (e, i) {
      var li = el("li", { class: "bird" + (e.you ? " bird-you" : "") + (i % 3 === 1 ? " flip" : "") });
      var img = el("img", { src: e.you ? "assets/pigeon-flap.webp" : "assets/pigeon.webp", alt: "", width: "58", height: "58", loading: "lazy" });
      if (!e.you) img.style.filter = "brightness(" + (0.82 + ((i * 37) % 30) / 100) + ") saturate(" + (0.8 + ((i * 53) % 40) / 100) + ")";
      li.appendChild(img);
      li.appendChild(el("span", { class: "bird-name" }, e.you ? "You" : e.name));
      var entry = el("span", { class: "bird-entry" }, R.formatUsd(e.cents));
      if (e.you) youEntryEl = entry;
      li.appendChild(entry);
      flock.appendChild(li);
      birdEls.push(li);
    });
  }
  buildFlock();

  function clearRound() {
    birdEls.forEach(function (b) {
      b.classList.remove("is-winner", "is-picking", "is-out");
      var badge = $(".bird-badge", b);
      if (badge) badge.remove();
      if (!b.classList.contains("bird-you")) $("img", b).src = "assets/pigeon.webp";
    });
    results.hidden = true;
    resHead.innerHTML = "";
    resBody.innerHTML = "";
  }

  function showResults(order, list) {
    resHead.innerHTML = "";
    resBody.innerHTML = "";
    var hr = el("tr");
    ["Rank", "Wallet", "Share"].concat(vaultAmts.map(function (v) { return v.symbol; })).forEach(function (h) { hr.appendChild(el("th", { scope: "col" }, h)); });
    resHead.appendChild(hr);
    order.forEach(function (idx, rank) {
      var tr = el("tr", list[idx].you ? { class: "row-you" } : null);
      tr.appendChild(el("td", { class: "num" }, ordinal(rank + 1)));
      tr.appendChild(el("td", null, list[idx].you ? "You" : list[idx].name));
      tr.appendChild(el("td", { class: "num" }, pct(draft[rank])));
      vaultAmts.forEach(function (v) { tr.appendChild(el("td", { class: "num" }, R.formatTokens(R.sliceMicros(v.micros, draft[rank])))); });
      resBody.appendChild(tr);
    });
    if (draftRest > 0) {
      var tr = el("tr", { class: "row-rest" });
      tr.appendChild(el("td", { class: "num" }, "-"));
      tr.appendChild(el("td", null, "Unassigned, to be confirmed"));
      tr.appendChild(el("td", { class: "num" }, pct(draftRest)));
      vaultAmts.forEach(function (v) { tr.appendChild(el("td", { class: "num" }, R.formatTokens(R.sliceMicros(v.micros, draftRest)))); });
      resBody.appendChild(tr);
    }
    results.hidden = false;
  }

  function finishRound(order, list) {
    birdEls.forEach(function (b, i) { if (order.indexOf(i) === -1) b.classList.add("is-out"); });
    var youRank = order.indexOf(youIndex);
    var msg = youRank === -1
      ? "Ten pigeons won. You didn't this time. The vault is pretend, so nobody lost anything."
      : "You placed " + ordinal(youRank + 1) + " and would take " + pct(draft[youRank]) + " of every pretend asset.";
    pStatus.textContent = msg;
    showResults(order, list);
    drawing = false;
    drawBtn.disabled = false;
    simBtn.disabled = false;
    resetBtn.disabled = false;
    drawBtn.textContent = "Light it again";
  }

  drawBtn.addEventListener("click", function () {
    if (drawing) return;
    drawing = true;
    clearRound();
    simOut.textContent = "";
    drawBtn.disabled = true;
    simBtn.disabled = true;
    var list = entrants();
    var order = R.drawWinners(list.map(function (e) { return e.cents; }), rules.winnersPerRound);
    function mark(rank) {
      var b = birdEls[order[rank]];
      b.classList.remove("is-picking");
      b.classList.add("is-winner");
      b.appendChild(el("span", { class: "bird-badge" }, ordinal(rank + 1) + " · " + pct(draft[rank])));
      if (!list[order[rank]].you) $("img", b).src = "assets/pigeon-flap.webp";
    }
    if (reduceMotion) {
      order.forEach(function (_, r) { mark(r); });
      finishRound(order, list);
      return;
    }
    pStatus.textContent = "The torch is picking...";
    var r = 0;
    (function next() {
      if (r >= order.length) { finishRound(order, list); return; }
      var b = birdEls[order[r]];
      b.classList.add("is-picking");
      setTimeout(function () { mark(r); r++; setTimeout(next, 120); }, 260);
    })();
  });

  resetBtn.addEventListener("click", function () {
    clearRound();
    pStatus.textContent = "Reset. Same pigeons, fresh round.";
    simOut.textContent = "";
    resetBtn.disabled = true;
    drawBtn.textContent = "Light the practice torch";
  });

  simBtn.addEventListener("click", function () {
    var list = entrants();
    var weights = list.map(function (e) { return e.cents; });
    var runs = C.practice.simulations;
    var s = R.simulate(weights, rules.winnersPerRound, youIndex, runs);
    var share = (lastNet / R.sum(weights)) * 100;
    simOut.innerHTML = "";
    simOut.appendChild(document.createTextNode("In " + runs.toLocaleString("en-US") + " practice rounds with " + R.formatUsd(lastNet) + ", you won a prize in "));
    simOut.appendChild(el("strong", null, Math.round((s.any / runs) * 100) + "%"));
    simOut.appendChild(document.createTextNode(" of them and took 1st in "));
    simOut.appendChild(el("strong", null, Math.round((s.first / runs) * 100) + "%"));
    simOut.appendChild(document.createTextNode(". Your share of the total entry weight is " + share.toFixed(1) + "%. Those numbers aren't the same, which is the point: with ten prizes and one per wallet, weight share isn't your chance. And this is one possible method, not the final one."));
    resetBtn.disabled = false;
  });

  carryBtn.addEventListener("click", function () {
    if (youEntryEl) youEntryEl.textContent = R.formatUsd(lastNet);
    clearRound();
    pStatus.textContent = "Your " + R.formatUsd(lastNet) + " example joined the practice round.";
    simOut.textContent = "";
    drawBtn.textContent = "Light the practice torch";
    var target = $("#torch");
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    setTimeout(function () { drawBtn.focus({ preventScroll: true }); }, reduceMotion ? 0 : 700);
  });
  calcInput.addEventListener("input", function () {
    // keep the "You" card in step with the tablet when no round is showing
    if (!drawing && results.hidden && youEntryEl) youEntryEl.textContent = R.formatUsd(lastNet);
  });

  /* Launch panel */
  var params = $("[data-params]");
  [
    ["Network", rules.network],
    ["Valuation", rules.valuation],
    ["Protocol fee", rules.feeBps / 100 + "% of each deposit"],
    ["Draw interval", "Every " + rules.drawIntervalMinutes + " minutes (proposed)"],
    ["Winners", rules.winnersPerRound + " per round, one prize per wallet"],
    ["Payouts", "In kind, draft split totals " + draftTotal + "%"],
    ["Wallet", rules.walletConnection]
  ].forEach(function (row) {
    var d = el("div");
    d.appendChild(el("dt", null, row[0]));
    d.appendChild(el("dd", null, row[1]));
    params.appendChild(d);
  });
  var todo = $("[data-todo]");
  C.openDecisions.forEach(function (t) { todo.appendChild(el("li", null, t)); });

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
})();
