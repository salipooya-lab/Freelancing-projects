# پروژه‌های علی پویا (بکاپ کد)

ریپوی خصوصی برای نگهداری کد ربات‌های تلگرام. توکن‌ها و اطلاعات ورود عمداً اینجا نیستند (در Secure Vault یا BotFather).

| پوشه | ربات | توضیح |
|---|---|---|
| `tv-signal-bot/` | @signal_ind_ap_bot | اندیکاتور Candle Sequence Setup Zones روی ۵۰ ارز برتر بایننس؛ ۳ ستاپ خرید فعال‌نشده + دکمه‌های «۳۰ سیگنال آخر» |
| `btc-price-bot/` | @btc_price_ap_bot | قیمت بیت‌کوین با /start و /btc |
| `insta-dl-bot/` | @insta_dl_ap_bot | دانلود ریل و پست اینستاگرام (بدون استوری) |
| `gcsinfo-bot/` | @gcsinfo_Bot | اسکریپت‌های ربات gcsinfo (فعلاً خاموش) |

## اجرای دوباره (ربات‌های Serverless)
1. `npm install` داخل پوشه‌ی ربات.
2. در BotFather → ربات → Serverless → CLI Access توکن CLI بگیر.
3. `TGCLOUD_TOKEN=<توکن CLI> npx tgcloud push` برای آپلود کد.

راهنمای کامل فارسی هر پروژه («راهنمای_پروژه.pdf») در Google Drive، پوشه‌ی «Muse Projects Backup» است.
