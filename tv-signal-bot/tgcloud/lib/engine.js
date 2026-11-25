// Port of "Candle Sequence Setup Zones" (Pine v6, © Ali Pooya) — signal logic only, default inputs.
// bars: [{t (open ms), T (close ms), o,h,l,c}] confirmed bars only, ascending.
// lastBarTime: open time of the chart's last bar (the forming one), for the month window.

export const DEFAULTS = {
  lenMode: 'whole', dojiBreak: false, minRun: 3, atrLen: 100, atrAtFirstOpposite: true,
  K: 0.6, sGreater: true, G: 1.0, gGreaterEq: true, W: 0.5, useEntryFilter: true,
  M: 2.0, RR: 1.0, showBuys: true, showSells: true, months: 6, maxShown: 40,
};

function monthStartUtc(flat) {
  const y = Math.floor(flat / 12);
  const m = flat - y * 12; // 0-based
  return Date.UTC(y, m, 1, 0, 0, 0);
}

export function runIndicator(bars, lastBarTime, opt = {}) {
  const p = { ...DEFAULTS, ...opt };
  const d = new Date(lastBarTime);
  const refFlat = d.getUTCFullYear() * 12 + d.getUTCMonth();
  const rangeStart = monthStartUtc(refFlat - p.months);

  // ATR (Wilder RMA of true range, seeded with SMA) — same as ta.atr
  const n0 = bars.length;
  const atr = new Array(n0).fill(NaN);
  let sum = 0, prev = NaN;
  for (let i = 0; i < n0; i++) {
    const b = bars[i];
    const tr = i === 0 ? b.h - b.l : Math.max(b.h - b.l, Math.abs(b.h - bars[i - 1].c), Math.abs(b.l - bars[i - 1].c));
    if (i < p.atrLen) {
      sum += tr;
      if (i === p.atrLen - 1) { prev = sum / p.atrLen; atr[i] = prev; }
    } else {
      prev = (tr + (p.atrLen - 1) * prev) / p.atrLen;
      atr[i] = prev;
    }
  }

  let col = 0, n = 0, s = 0, p1 = NaN, p1x = NaN;
  let lastRedHigh = NaN, lastRedX = NaN, lastGreenLow = NaN, lastGreenX = NaN;
  let buyNo = 0, sellNo = 0;
  const setups = []; // {id, dir, entry, sl, tp, state, bar, time, p1, p2}

  for (let i = 0; i < n0; i++) {
    const b = bars[i];
    const aFreeze = p.atrAtFirstOpposite ? atr[i] : (i > 0 ? atr[i - 1] : NaN);
    const rangeOk = b.T >= rangeStart;

    // f_update
    for (const st of setups) {
      if (st.state === 0 && (st.dir === 1 ? b.l <= st.entry : b.h >= st.entry)) {
        st.state = 1; st.activatedAt = b.t;
        const f = firstTouch(b, st);
        if (f !== 0) { st.state = f === 1 ? 2 : 3; st.closedAt = b.t; }
      } else if (st.state === 1) {
        const f = firstTouch(b, st);
        if (f !== 0) { st.state = f === 1 ? 2 : 3; st.closedAt = b.t; }
      }
    }

    const dirOf = b.c > b.o ? 1 : b.c < b.o ? -1 : 0;
    const lenOf = p.lenMode === 'body' ? Math.abs(b.c - b.o) : b.h - b.l;

    if (dirOf !== 0) {
      if (dirOf === 1) { lastGreenLow = b.l; lastGreenX = i; } else { lastRedHigh = b.h; lastRedX = i; }
      if (col !== dirOf) {
        if (col !== 0) {
          const isBuy = col === 1;
          const p2v = isBuy ? b.l : b.h;
          const okData = !isNaN(p1) && !isNaN(p1x) && !isNaN(aFreeze) && !isNaN(p2v);
          const okN = n >= p.minRun;
          const okS = p.sGreater ? s > n * p.K * aFreeze : s >= n * p.K * aFreeze;
          const dist = Math.abs(p1 - p2v);
          const okG = p.gGreaterEq ? dist >= p.G * aFreeze : dist > p.G * aFreeze;
          const okDir = isBuy ? p2v > p1 : p2v < p1;
          const entry = p1 + p.W * (p2v - p1);
          const okW = !p.useEntryFilter || (isBuy ? entry < b.c : entry > b.c);
          const ok = okData && okN && okS && okG && okDir && okW && rangeOk && (isBuy ? p.showBuys : p.showSells);
          if (ok) {
            const sl = isBuy ? entry - p.M * aFreeze : entry + p.M * aFreeze;
            const risk = Math.abs(sl - entry);
            const tp = isBuy ? entry + p.RR * risk : entry - p.RR * risk;
            const id = isBuy ? 'BUY-' + String(++buyNo).padStart(3, '0') : 'SELL-' + String(++sellNo).padStart(3, '0');
            setups.push({ id, dir: col, entry, sl, tp, state: 0, bar: i, time: b.t, p1, p2: p2v, n, s, A: aFreeze });
            while (setups.length > p.maxShown) setups.shift();
          }
        }
        p1 = dirOf === 1 ? lastRedHigh : lastGreenLow;
        p1x = dirOf === 1 ? lastRedX : lastGreenX;
        col = dirOf; n = 1; s = lenOf;
      } else { n += 1; s += lenOf; }
    } else if (p.dojiBreak && col !== 0) {
      col = 0; n = 0; s = 0; p1 = NaN; p1x = NaN;
    }
  }
  return setups;
}

function firstTouch(b, st) {
  const up = st.dir === 1;
  const hitTp = up ? b.h >= st.tp : b.l <= st.tp;
  const hitSl = up ? b.l <= st.sl : b.h >= st.sl;
  if (hitTp && hitSl) return Math.abs(b.o - st.tp) <= Math.abs(b.o - st.sl) ? 1 : -1;
  if (hitTp) return 1;
  if (hitSl) return -1;
  return 0;
}

// Last `count` BUY setups still pending (entry not reached) — the bright ones on the chart.
export function lastPendingBuys(setups, count = 3) {
  return setups.filter((x) => x.dir === 1 && x.state === 0).slice(-count).reverse();
}
