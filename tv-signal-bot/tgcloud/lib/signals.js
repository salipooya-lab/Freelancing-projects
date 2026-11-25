import { fetch } from 'sdk';
import { runIndicator, lastPendingBuys } from './engine.js';
import { COINS } from './coins.js';

export const TF = [['5m', '۵ دقیقه'], ['15m', '۱۵ دقیقه'], ['30m', '۳۰ دقیقه'], ['1h', '۱ ساعته'], ['2h', '۲ ساعته'], ['4h', '۴ ساعته']];
const IV = { '5m': 3e5, '15m': 9e5, '30m': 18e5, '1h': 36e5, '2h': 72e5, '4h': 144e5 };
const HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com'];
const PAGES = 3; // 3 x 1000 bars — results are identical to longer histories (tested 2026-11-25)

async function page(sym, iv, endTime) {
  let lastErr;
  for (const h of HOSTS) {
    try {
      const u = `${h}/api/v3/klines?symbol=${sym}&interval=${iv}&limit=1000` + (endTime ? `&endTime=${endTime}` : '');
      const r = await fetch(u);
      if (r.ok) return await r.json();
      lastErr = new Error('HTTP ' + r.status);
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

export async function getBars(sym, iv, pagesN = PAGES) {
  const step = IV[iv];
  const now = Date.now();
  const curOpen = Math.floor(now / step) * step;
  const ends = [];
  for (let k = 0; k < pagesN; k++) ends.push(k === 0 ? null : curOpen - k * 1000 * step - 1);
  const pages = await Promise.all(ends.map((e) => page(sym, iv, e)));
  const map = new Map();
  for (const pg of pages) for (const k of pg) map.set(k[0], k);
  const rows = [...map.values()].sort((a, b) => a[0] - b[0]);
  const bars = rows.map((k) => ({ t: k[0], T: k[0] + step, o: +k[1], h: +k[2], l: +k[3], c: +k[4] }));
  const forming = bars.length && bars[bars.length - 1].T > now ? bars[bars.length - 1] : null;
  const confirmed = bars.filter((b) => b.T <= now);
  return { confirmed, lastBarTime: forming ? forming.t : curOpen, lastPrice: bars.length ? bars[bars.length - 1].c : NaN };
}

function tehran(ms) {
  const d = new Date(ms + 3.5 * 3600e3); // Iran: UTC+03:30, no DST
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export async function buildReport(coin, iv) {
  const c = COINS.find((x) => x[0] === coin);
  if (!c || !IV[iv]) return 'نماد یا تایم‌فریم نامعتبره.';
  const dec = c[1];
  const sym = coin + 'USDT';
  const { confirmed, lastBarTime, lastPrice } = await getBars(sym, iv);
  const setups = runIndicator(confirmed, lastBarTime);
  const buys = lastPendingBuys(setups, 3);
  const tfName = TF.find((x) => x[0] === iv)[1];
  const f = (x) => x.toFixed(dec);
  let out = `📊 ${sym} | ${tfName}\nقیمت فعلی: ${f(lastPrice)}\n\n`;
  if (!buys.length) {
    out += 'الان هیچ سیگنال خرید فعال‌نشده‌ای (پررنگ) روی چارت نیست.';
  } else {
    out += `${buys.length === 3 ? '۳' : buys.length === 2 ? '۲' : '۱'} سیگنال خرید آخر که هنوز فعال نشدن:\n`;
    buys.forEach((b, i) => {
      const dist = ((lastPrice - b.entry) / lastPrice) * 100;
      out += `\n🟢 خرید ${i + 1} — کندل ${tehran(b.time)} (تهران)\n` +
        `ورود: ${f(b.entry)}\nحد ضرر: ${f(b.sl)}\nحد سود: ${f(b.tp)}\n` +
        `فاصله تا ورود: ${dist.toFixed(2)}٪\n`;
    });
  }
  out += `\nداده: Binance (مطابق چارت BINANCE:${sym} در تریدینگ ویو)`;
  return out;
}

// Scan coins in random order on one timeframe; collect still-pending BUY setups until `target` reached.
export async function scanReport(iv, target = 30, batch = 10, pagesN = iv === '5m' ? 2 : 1, budgetMs = 22000) {
  const t0 = Date.now();
  const tfName = (TF.find((x) => x[0] === iv) || [, iv])[1];
  const order = COINS.map((c) => c).sort(() => Math.random() - 0.5);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const found = [];
  let scanned = 0, failed = 0;
  let timedOut = false;
  for (let i = 0; i < order.length && found.length < target; i += batch) {
    if (Date.now() - t0 > budgetMs) { timedOut = true; break; }
    const chunk = order.slice(i, i + batch);
    const res = await Promise.all(chunk.map(async ([coin, dec]) => {
      try {
        const { confirmed, lastBarTime, lastPrice } = await getBars(coin + 'USDT', iv, pagesN);
        const buys = runIndicator(confirmed, lastBarTime).filter((x) => x.dir === 1 && x.state === 0);
        return buys.map((b) => ({ coin, dec, lastPrice, ...b }));
      } catch (e) { failed++; return []; }
    }));
    // keep random coin order; within the batch add coin by coin until target
    for (const arr of res) {
      scanned++;
      for (const b of arr.slice().reverse()) { if (found.length < target) found.push(b); }
    }
  }
  found.sort((a, b) => b.time - a.time);
  let out = `📋 ${found.length} سیگنال خرید فعال‌نشده | ${tfName}\n(${scanned} ارز به ترتیب تصادفی بررسی شد${failed ? `، ${failed} ارز داده نداد` : ''}${timedOut ? '، به‌خاطر محدودیت زمان بقیه بررسی نشد' : ''})\n`;
  if (!found.length) return out + '\nهیچ سیگنال خرید فعال‌نشده‌ای پیدا نشد.';
  found.forEach((b, i) => {
    const f = (x) => x.toFixed(b.dec);
    const dist = ((b.lastPrice - b.entry) / b.lastPrice) * 100;
    out += `\n${i + 1}) ${b.coin} — ${tehran(b.time)}\nورود ${f(b.entry)} | ضرر ${f(b.sl)} | سود ${f(b.tp)} | ${dist.toFixed(1)}٪\n`;
  });
  return out;
}
