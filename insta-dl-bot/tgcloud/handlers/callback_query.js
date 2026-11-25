import { api } from 'sdk';
import * as ui from '../lib/ui.js';

export default async function (q) {
  const msg = q.message;
  const views = {
    home: [ui.welcomeText(q.from && q.from.first_name), ui.mainKeyboard()],
    help: [ui.HELP_TEXT, ui.backKeyboard()],
    about: [ui.ABOUT_TEXT, ui.backKeyboard()],
    yt: [ui.YT_TEXT, ui.backKeyboard()],
  };
  const v = views[q.data];
  await api.answerCallbackQuery({ callback_query_id: q.id });
  if (!v || !msg) return;
  try {
    await api.editMessageText({ chat_id: msg.chat.id, message_id: msg.message_id, text: v[0], parse_mode: 'HTML', reply_markup: v[1] });
  } catch (e) {
    // "message is not modified" is harmless
  }
}
