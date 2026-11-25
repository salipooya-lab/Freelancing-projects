// UI texts and keyboards (Persian, RTL-friendly).
export const BOT_NAME = 'اینستا دانلودر';

export function mainKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📥 چطوری دانلود کنم؟', callback_data: 'help' }],
      [
        { text: '🎬 یوتیوب', callback_data: 'yt' },
        { text: 'ℹ️ درباره ربات', callback_data: 'about' },
      ],
    ],
  };
}

export function backKeyboard() {
  return { inline_keyboard: [[{ text: '🔙 بازگشت به منو', callback_data: 'home' }]] };
}

export function resultKeyboard(botUsername, igUrl) {
  const share = 'https://t.me/share/url?url=' + encodeURIComponent('https://t.me/' + botUsername) +
    '&text=' + encodeURIComponent('با این ربات ویدیوهای اینستاگرام رو راحت دانلود کن 👇');
  const rows = [];
  if (igUrl) rows.push([{ text: '🔗 مشاهده پست در اینستاگرام', url: igUrl }]);
  rows.push([{ text: '📤 معرفی ربات به دوستان', url: share }]);
  return { inline_keyboard: rows };
}

export function welcomeText(firstName) {
  const name = firstName ? ` ${firstName}` : '';
  return (
    `سلام${name} 👋\n` +
    `به <b>${BOT_NAME}</b> خوش اومدی ✨\n\n` +
    `فقط کافیه لینک پست، ریلز، IGTV یا آلبوم اینستاگرام رو برام بفرستی تا فایلش رو همین‌جا تحویل بگیری 🎁\n\n` +
    `⚡️ سریع  •  🎞 با کیفیت اصلی  •  🆓 رایگان`
  );
}

export const HELP_TEXT =
  `<b>📥 آموزش دانلود</b>\n\n` +
  `1️⃣ توی اینستاگرام روی پست یا ریلز بزن\n` +
  `2️⃣ دکمه <b>اشتراک‌گذاری</b> ↗️ و بعد <b>Copy link</b> رو بزن\n` +
  `3️⃣ لینک رو همین‌جا برای من بفرست\n\n` +
  `✅ پشتیبانی: پست، ریلز، IGTV، آلبوم چندتایی\n` +
  `⚠️ پیج‌های خصوصی (Private) قابل دانلود نیستن`;

export const ABOUT_TEXT =
  `<b>ℹ️ درباره ربات</b>\n\n` +
  `این ربات بدون نیاز به سرور، مستقیم روی زیرساخت خود تلگرام اجرا میشه و ۲۴ ساعته در دسترسه 🚀\n\n` +
  `هیچ اطلاعاتی از حساب اینستاگرام شما لازم نیست؛ فقط لینک عمومی پست کافیه.`;

export const YT_TEXT =
  `<b>🎬 دانلود از یوتیوب</b>\n\n` +
  `این بخش به‌زودی اضافه میشه 🛠\n` +
  `فعلاً تمرکز ربات روی اینستاگرامه.`;

export const WORKING_TEXT = '⏳ در حال دریافت از اینستاگرام...';

export function errorText(code, story) {
  if (story) return '🔒 استوری‌ها فقط برای کاربرانی که وارد اینستاگرام شدن نمایش داده میشن و فعلاً قابل دانلود نیستن.';
  if (/private|content\.post\.private/i.test(code)) return '🔒 این پست مال یه پیج خصوصیه و قابل دانلود نیست.';
  if (/unavailable|empty|not_found/i.test(code)) return '😕 پستی با این لینک پیدا نشد. ممکنه حذف شده باشه یا لینک اشتباه باشه.';
  if (/link\.invalid|unsupported/i.test(code)) return '❌ این لینک معتبر نیست. لینک پست یا ریلز اینستاگرام رو بفرست.';
  return '⚠️ الان نتونستم فایل رو بگیرم. چند لحظه دیگه دوباره امتحان کن 🙏';
}

export const NOT_LINK_TEXT =
  '🔗 لطفاً لینک پست یا ریلز اینستاگرام رو بفرست.\nمثلاً:\n<code>https://www.instagram.com/reel/XXXXXXXXX/</code>';
