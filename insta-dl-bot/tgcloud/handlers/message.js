import { api, InputFile } from 'sdk';
import { extractInstagramUrl, isStory, resolve, download } from '../lib/insta.js';
import * as ui from '../lib/ui.js';

let botUsername = null;
async function username() {
  if (!botUsername) botUsername = (await api.getMe()).username;
  return botUsername;
}

async function sendOne(chatId, item, extra) {
  const isVideo = item.type === 'video';
  const method = isVideo ? 'sendVideo' : 'sendPhoto';
  const field = isVideo ? 'video' : 'photo';
  const base = { chat_id: chatId, ...extra };
  if (isVideo) base.supports_streaming = true;
  try {
    // Fast path: Telegram fetches the file itself (works up to ~20 MB).
    return await api[method]({ ...base, [field]: item.url });
  } catch (e) {
    // Slow path: download here (≤30 MB) and upload as a real file (bot limit 50 MB).
    const bytes = await download(item.url);
    const file = new InputFile(bytes, isVideo ? 'video.mp4' : 'photo.jpg', { type: isVideo ? 'video/mp4' : 'image/jpeg' });
    return await api[method]({ ...base, [field]: file });
  }
}

async function sendAlbum(chatId, items) {
  for (let i = 0; i < items.length; i += 10) {
    const chunk = items.slice(i, i + 10);
    try {
      await api.sendMediaGroup({ chat_id: chatId, media: chunk.map((it) => ({ type: it.type, media: it.url })) });
    } catch (e) {
      for (const it of chunk) await sendOne(chatId, it, {});
    }
  }
}

export default async function (message) {
  const chatId = message.chat.id;
  const text = (message.text || message.caption || '').trim();

  if (text.startsWith('/start') || text.startsWith('/menu')) {
    await api.sendMessage({ chat_id: chatId, text: ui.welcomeText(message.from && message.from.first_name), parse_mode: 'HTML', reply_markup: ui.mainKeyboard() });
    return;
  }
  if (text.startsWith('/help')) {
    await api.sendMessage({ chat_id: chatId, text: ui.HELP_TEXT, parse_mode: 'HTML', reply_markup: ui.backKeyboard() });
    return;
  }

  const igUrl = extractInstagramUrl(text);
  if (!igUrl) {
    await api.sendMessage({ chat_id: chatId, text: ui.NOT_LINK_TEXT, parse_mode: 'HTML', reply_to_message_id: message.message_id });
    return;
  }

  const wait = await api.sendMessage({ chat_id: chatId, text: ui.WORKING_TEXT, reply_to_message_id: message.message_id });
  const done = async () => { try { await api.deleteMessage({ chat_id: chatId, message_id: wait.message_id }); } catch {} };

  let result;
  try {
    result = await resolve(igUrl);
  } catch (e) {
    await api.editMessageText({ chat_id: chatId, message_id: wait.message_id, text: ui.errorText(e.code || '', isStory(igUrl)) });
    return;
  }

  try {
    await api.sendChatAction({ chat_id: chatId, action: result.items[0].type === 'video' ? 'upload_video' : 'upload_photo' });
    const me = await username();
    const caption = `✅ دانلود شد\n🤖 @${me}`;
    if (result.items.length === 1) {
      await sendOne(chatId, result.items[0], { caption, reply_markup: ui.resultKeyboard(me, igUrl) });
    } else {
      await sendAlbum(chatId, result.items);
      await api.sendMessage({ chat_id: chatId, text: `✅ ${result.items.length} فایل این آلبوم ارسال شد\n🤖 @${me}`, reply_markup: ui.resultKeyboard(me, igUrl) });
    }
    await done();
  } catch (e) {
    console.error('send failed', String(e && e.message || e));
    await api.editMessageText({ chat_id: chatId, message_id: wait.message_id, text: '⚠️ فایل پیدا شد ولی ارسالش ناموفق بود (احتمالاً حجمش بیشتر از حد مجاز تلگرامه). یه پست دیگه رو امتحان کن.' });
  }
}
