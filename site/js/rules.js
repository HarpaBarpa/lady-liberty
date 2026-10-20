/* Lady Liberty: calculator and practice-round arithmetic.
   Money is integer cents everywhere; token amounts are integer millionths. */
(function () {
  "use strict";

  function parseUsdToCents(raw, limits) {
    var s = String(raw == null ? "" : raw).trim().replace(/[$,\s]/g, "");
    if (s === "") return { ok: false, error: "Enter an amount to see the example." };
    if (!/^\d*\.?\d*$/.test(s) || s === ".") return { ok: false, error: "Use numbers only, like 100 or 42.50." };
    var parts = s.split(".");
    if (parts[1] && parts[1].length > 2) return { ok: false, error: "Cents only go two places." };
    var whole = parts[0] === "" ? 0 : parseInt(parts[0], 10);
    var frac = parts[1] ? parseInt((parts[1] + "00").slice(0, 2), 10) : 0;
    if (whole > 10000000) return { ok: false, error: "The tablet stops at " + formatUsd(limits.maxCents) + " for this example." };
    var cents = whole * 100 + frac;
    if (cents < limits.minCents) return { ok: false, error: "The example starts at " + formatUsd(limits.minCents) + "." };
    if (cents > limits.maxCents) return { ok: false, error: "The tablet stops at " + formatUsd(limits.maxCents) + " for this example." };
    return { ok: true, cents: cents };
  }

  // Rounds half up to the cent. The real precision rule is still open.
  function feeCents(cents, feeBps) {
    return Math.floor((cents * feeBps + 5000) / 10000);
  }

  function split(cents, feeBps) {
    var fee = feeCents(cents, feeBps);
    return { gross: cents, fee: fee, net: cents - fee };
  }

  function formatUsd(cents) {
    var neg = cents < 0;
    var c = Math.abs(cents);
    var dollars = Math.floor(c / 100);
    var rem = c % 100;
    return (neg ? "-$" : "$") + dollars.toLocaleString("en-US") + "." + (rem < 10 ? "0" : "") + rem;
  }

  function toRoman(n) {
    if (!(n >= 1 && n <= 3999)) return null;
    var map = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
      [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
    var out = "";
    for (var i = 0; i < map.length; i++) {
      while (n >= map[i][0]) { out += map[i][1]; n -= map[i][0]; }
    }
    return out;
  }

  // Share of a token amount (millionths) for a whole-number percent.
  function sliceMicros(micros, pct) {
    return Math.floor((micros * pct) / 100);
  }

  function formatTokens(micros) {
    var whole = Math.floor(micros / 1000000);
    var frac = String(micros % 1000000).padStart(6, "0").replace(/0+$/, "");
    return frac ? whole + "." + frac : String(whole);
  }

  function timeAgo(ms) {
    var diff = Date.now() - ms;
    var sec = Math.floor(diff / 1000);
    if (sec < 5) return "just now";
    if (sec < 60) return sec + "s ago";
    var min = Math.floor(sec / 60);
    if (min < 60) return min + "m ago";
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + "h ago";
    var d = Math.floor(hr / 24);
    if (d < 30) return d + "d ago";
    return Math.floor(d / 30) + "mo ago";
  }

  function sum(list) {
    var t = 0;
    for (var i = 0; i < list.length; i++) t += list[i];
    return t;
  }

  function random01() {
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return a[0] / 4294967296;
    }
    return Math.random();
  }

  // One possible method, for illustration only: weighted picks without replacement,
  // so each wallet wins at most one prize. Returns entrant indexes in rank order.
  function drawWinners(weights, count, rnd) {
    rnd = rnd || random01;
    var pool = [];
    for (var i = 0; i < weights.length; i++) if (weights[i] > 0) pool.push(i);
    var winners = [];
    while (winners.length < count && pool.length) {
      var total = 0;
      for (var j = 0; j < pool.length; j++) total += weights[pool[j]];
      var r = rnd() * total;
      var k = 0;
      for (; k < pool.length - 1; k++) {
        r -= weights[pool[k]];
        if (r < 0) break;
      }
      winners.push(pool[k]);
      pool.splice(k, 1);
    }
    return winners;
  }

  function simulate(weights, count, youIndex, runs) {
    var any = 0, first = 0;
    for (var n = 0; n < runs; n++) {
      var w = drawWinners(weights, count, Math.random);
      var pos = w.indexOf(youIndex);
      if (pos !== -1) any++;
      if (pos === 0) first++;
    }
    return { runs: runs, any: any, first: first };
  }

  window.LibertyRules = {
    parseUsdToCents: parseUsdToCents,
    feeCents: feeCents,
    split: split,
    formatUsd: formatUsd,
    toRoman: toRoman,
    sliceMicros: sliceMicros,
    formatTokens: formatTokens,
    timeAgo: timeAgo,
    sum: sum,
    drawWinners: drawWinners,
    simulate: simulate
  };
})();
