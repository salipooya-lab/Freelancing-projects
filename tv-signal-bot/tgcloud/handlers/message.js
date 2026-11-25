import { api } from 'sdk';
import { coinKeyboard, START_TEXT } from '../lib/ui.js';

export default async function (message) {
  if (!message.chat) return;
  await api.sendMessage({ chat_id: message.chat.id, text: START_TEXT, reply_markup: coinKeyboard() });
}
