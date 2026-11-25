// Instagram media resolver: sends a link to cobalt-compatible APIs with failover.
import { fetch } from 'sdk';

// Community cobalt instances that answered without auth from Telegram Serverless (tested 2026-11-23).
// Order = priority. Add/remove here without touching the rest of the bot.
export const INSTANCES = [
  'https://rue-cobalt.xenon.zone',
  'https://api.cobalt.liubquanti.click',
];

const IG_RE = /https?:\/\/(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/(?:[A-Za-z0-9_.]+\/)?(?:p|reel|reels|tv|stories|share)\/[^\s]+/i;

export function extractInstagramUrl(text) {
  if (!text) return null;
  const m = text.match(IG_RE);
  return m ? m[0].replace(/[)\]>.,]+$/, '') : null;
}

export function isStory(url) {
  return /\/stories\//i.test(url);
}

function kindFromName(name, fallback) {
  const n = (name || '').toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|$)/.test(n)) return 'video';
  if (/\.(jpe?g|png|webp|heic)(\?|$)/.test(n)) return 'photo';
  if (/\.gif(\?|$)/.test(n)) return 'video';
  return fallback;
}

// Returns { items: [{ type: 'video'|'photo', url }], source } or throws Error with .code
export async function resolve(url) {
  let lastCode = 'error.unknown';
  for (const base of INSTANCES) {
    try {
      const r = await fetch(base + '/', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'insta-dl-bot/1.0' },
        body: JSON.stringify({ url, videoQuality: '1080', filenameStyle: 'basic' }),
      });
      const data = JSON.parse(await r.text());
      if (data.status === 'redirect' || data.status === 'tunnel') {
        const type = kindFromName(data.filename, kindFromName(data.url, 'video'));
        return { items: [{ type, url: data.url }], source: base };
      }
      if (data.status === 'picker' && Array.isArray(data.picker) && data.picker.length) {
        const items = data.picker.map((p) => ({ type: p.type === 'photo' ? 'photo' : 'video', url: p.url }));
        return { items, source: base };
      }
      lastCode = (data.error && data.error.code) || 'error.unknown';
      // content-level errors are the same on every instance; stop early
      if (/content|private|unavailable|fetch\.empty|link\.invalid|link\.unsupported/i.test(lastCode)) break;
    } catch (e) {
      lastCode = 'error.network';
    }
  }
  const err = new Error(lastCode);
  err.code = lastCode;
  throw err;
}

// Download bytes (≤ ~30 MB platform cap) so we can upload them ourselves when Telegram can't fetch the URL.
export async function download(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error('download ' + r.status);
  const chunks = [];
  let size = 0;
  for await (const c of r.body) { chunks.push(c); size += c.length; }
  const out = new Uint8Array(size);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}
