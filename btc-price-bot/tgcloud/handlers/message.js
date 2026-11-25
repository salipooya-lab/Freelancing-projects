import { api, fetch } from 'sdk';

async function getBtcPrice() {
  // منبع اول: CoinGecko (قیمت + تغییر ۲۴ ساعته)
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
    if (r.ok) {
      const d = await r.json();
      return { price: d.bitcoin.usd, change: d.bitcoin.usd_24h_change };
    }
  } catch (e) { console.warn('coingecko failed', e); }
  // منبع پشتیبان: Coinbase
  const r = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
  if (!r.ok) throw new Error('all price sources failed');
  const d = await r.json();
  return { price: Number(d.data.amount), change: null };
}

export default async function (message) {
  const text = (message.text || '').trim();
  const cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase();
  const chat_id = message.chat.id;

  if (cmd === '/start') {
    await api.sendMessage({ chat_id, text: 'سلام! برای دیدن قیمت لحظه‌ای بیت‌کوین /btc رو بزن.' });
    return;
  }

  if (cmd === '/btc') {
    try {
      const { price, change } = await getBtcPrice();
      const p = price.toLocaleString('en-US', { maximumFractionDigits: 2 });
      let msg = `💰 قیمت بیت‌کوین: $${p}`;
      if (change !== null) msg += `\nتغییر ۲۴ ساعته: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
      await api.sendMessage({ chat_id, text: msg });
    } catch (e) {
      console.error(e);
      await api.sendMessage({ chat_id, text: 'الان نتونستم قیمت رو بگیرم، چند لحظه دیگه دوباره /btc رو بزن.' });
    }
  }
}
