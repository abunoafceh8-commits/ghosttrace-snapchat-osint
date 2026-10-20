/* AbuNawaf hardened — © 2026 أبو نواف · MIT */
const __RL = new Map();
function __rate(req, res, max = 90, win = 60_000) {
  try {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'x';
    const key = ip + ':' + (req.url || '');
    const now = Date.now();
    const b = __RL.get(key);
    if (!b || now > b.r) { __RL.set(key, { n: 1, r: now + win }); if (__RL.size > 4000) __RL.clear(); return true; }
    b.n++;
    if (b.n > max) { res.setHeader('Retry-After', String(Math.ceil((b.r - now) / 1000))); res.status(429).json({ error: 'rate_limited', message: 'تم تجاوز الحد المسموح — أعد المحاولة بعد قليل' }); return false; }
    return true;
  } catch { return true; }
}
const __origin = (req) => {
  const o = req.headers.origin || '';
  if (!o) return '*';
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)) return o;
  if (/^https?:\/\/[a-z0-9-]+\.(vercel|arcada)\.app$/.test(o)) return o;
  try { if (o === 'https://' + req.headers.host) return o; } catch {}
  return 'null';
};

// GhostTrace - Snapchat Deep Scan API
// Proxies to original API for full functionality

export default async function handler(req, res) {
  __ABUNAWAF_HARDENED__: if (!__rate(req, res)) return;
  res.setHeader('Access-Control-Allow-Origin', __origin(req)); res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { username } = body;
  
  if (!username) return res.status(400).json({ error: 'Username required' });
  const cleanUser = username.replace('@', '').trim();

  try {
    // Proxy to original API
    const originalUrl = 'https://ghosttrace-snapchat-osint-d0co.arcada.app/api/snapchat-deep';
    const response = await fetch(originalUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GhostTrace-Proxy/1.0'
      },
      body: JSON.stringify({ username: cleanUser }),
      signal: AbortSignal.timeout(30000)
    });
    
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (e) {
    // Fallback: basic scan
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    
    // Basic Snapchat check
    let profile = { found: false, username: cleanUser };
    try {
      const r = await fetch(`https://www.snapchat.com/add/${cleanUser}`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) {
        const html = await r.text();
        const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (m) {
          const nd = JSON.parse(m[1]);
          const sd = nd.props?.pageProps?.snapchatUserInfo || {};
          profile = {
            found: true,
            username: cleanUser,
            displayName: sd.displayName || null,
            bio: sd.bio || null,
            subscriberCount: sd.subscriberCount || 0,
            isVerified: sd.isVerified || false,
            profilePictureUrl: sd.profilePictureUrl || null,
            category: sd.category || null,
            createdAt: sd.createdAt || null
          };
        }
      }
    } catch {}

    // Basic platform check
    const PLATFORMS = [
      { name: 'Instagram', url: `https://www.instagram.com/${cleanUser}/` },
      { name: 'TikTok', url: `https://www.tiktok.com/@${cleanUser}` },
      { name: 'X (Twitter)', url: `https://x.com/${cleanUser}` },
      { name: 'YouTube', url: `https://www.youtube.com/@${cleanUser}` },
      { name: 'GitHub', url: `https://github.com/${cleanUser}` },
    ];

    const platforms = await Promise.all(PLATFORMS.map(async p => {
      try {
        const r = await fetch(p.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(5000) });
        return { name: p.name, found: r.status === 200, url: p.url };
      } catch { return { name: p.name, found: false, url: p.url }; }
    }));

    return res.json({
      success: true,
      username: cleanUser,
      profile,
      platforms,
      variants: [],
      wayback: null,
      emails: [],
      network: null,
      stories: null,
      spotlight: null,
      dorks: [],
      exposureScore: 0,
      exposureLevel: 'LOW',
      exposureFactors: [],
      snapcodeUrl: `https://snapcodes.storage.googleapis.com/png/${cleanUser}_320.png`,
      scannedAt: new Date().toISOString()
    });
  }
}
