import { COINS } from './coins.js';
import { TF } from './signals.js';

export function coinKeyboard() {
  const rows = [];
  for (let i = 0; i < COINS.length; i += 5) {
    rows.push(COINS.slice(i, i + 5).map(([s]) => ({ text: s, callback_data: 'c:' + s })));
  }
  for (let i = 0; i < TF.length; i += 1) {
    rows.push(TF.slice(i, i + 1).map(([iv, name]) => ({ text: `۳۰ سیگنال آخر تایم‌فریم ${name}`, callback_data: 's:' + iv })));
  }
  return { inline_keyboard: rows };
}

export function tfKeyboard(coin) {
  const btn = ([iv, name]) => ({ text: name, callback_data: `t:${coin}:${iv}` });
  return {
    inline_keyboard: [TF.slice(0, 3).map(btn), TF.slice(3).map(btn), [{ text: '⬅️ انتخاب ارز دیگه', callback_data: 'back' }]],
  };
}

export const START_TEXT = 'سلام! ارز مورد نظرت رو انتخاب کن (۵۰ ارز اول از نظر مارکت کپ، جفت USDT):';
