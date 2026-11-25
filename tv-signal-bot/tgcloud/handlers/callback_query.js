import { api } from 'sdk';
import { coinKeyboard, tfKeyboard, START_TEXT } from '../lib/ui.js';
import { buildReport, scanReport, TF } from '../lib/signals.js';

export default async function (q) {
  const data = q.data || '';
  const chat_id = q.message && q.message.chat.id;
  const message_id = q.message && q.message.message_id;
  try { await api.answerCallbackQuery({ callback_query_id: q.id }); } catch (e) {}
  if (!chat_id) return;

  if (data === 'back') {
    await api.editMessageText({ chat_id, message_id, text: START_TEXT, reply_markup: coinKeyboard() });
    return;
  }
  if (data.startsWith('c:')) {
    const coin = data.slice(2);
    await api.editMessageText({ chat_id, message_id, text: `${coin}USDT — تایم‌فریم رو انتخاب کن:`, reply_markup: tfKeyboard(coin) });
    return;
  }
  if (data.startsWith('s:')) {
    const iv = data.slice(2);
    const tfName = (TF.find((x) => x[0] === iv) || [, iv])[1];
    await api.editMessageText({ chat_id, message_id, text: `⏳ در حال بررسی ارزها روی تایم‌فریم ${tfName} ... (ممکنه تا یک دقیقه طول بکشه)` });
    let text;
    try { text = await scanReport(iv); }
    catch (e) { console.error(e); text = 'الان نتونستم بررسی رو کامل کنم. چند لحظه دیگه دوباره امتحان کن.'; }
    if (text.length > 4000) text = text.slice(0, 3990) + '\n…';
    await api.editMessageText({ chat_id, message_id, text, reply_markup: { inline_keyboard: [[{ text: '🔄 دوباره', callback_data: data }], [{ text: '⬅️ منوی اصلی', callback_data: 'back' }]] } });
    return;
  }
  if (data.startsWith('t:')) {
    const [, coin, iv] = data.split(':');
    const tfName = (TF.find((x) => x[0] === iv) || [, iv])[1];
    await api.editMessageText({ chat_id, message_id, text: `⏳ در حال محاسبه ${coin}USDT | ${tfName} ...` });
    let text;
    try { text = await buildReport(coin, iv); }
    catch (e) { console.error(e); text = 'الان نتونستم داده‌ی قیمت رو بگیرم. چند لحظه دیگه دوباره امتحان کن.'; }
    await api.editMessageText({ chat_id, message_id, text, reply_markup: tfKeyboard(coin) });
  }
}
