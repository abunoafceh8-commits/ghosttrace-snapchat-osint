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

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const username = (body.username || '').replace('@', '').trim();
  
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  const email = body.email || '';
  
  // Run all intelligence gathering in parallel
  const [profile, platforms, wayback, network] = await Promise.allSettled([
    getSnapchatProfile(username),
    crossPlatformSearch(username),
    waybackSearch(username),
    networkIntel(username)
  ]);
  
  const snapchatProfile = profile.status === 'fulfilled' ? profile.value : { found: false, username };
  const crossPlatforms = platforms.status === 'fulfilled' ? platforms.value : [];
  const waybackData = wayback.status === 'fulfilled' ? wayback.value : { snapchat: { snapshots: 0 } };
  const networkData = network.status === 'fulfilled' ? network.value : { domains: [], ips: [] };
  
  // Generate dorks
  const dorks = generateDorks(username, email);
  
  // Calculate exposure
  const exposure = calculateExposureScore(snapchatProfile, crossPlatforms, waybackData, networkData);
  
  // Username variants
  const variants = [
    username,
    username + '_',
    '_' + username,
    username + '123',
    username + '01',
    username.replace(/[aeiou]/gi, ''),
    username[0] + username.slice(-3),
  ].filter((v, i, arr) => arr.indexOf(v) === i);
  
  res.json({
    success: true,
    username,
    
    // Deep Snapchat profile
    profile: snapchatProfile,
    
    // Cross-platform intelligence
    platforms: crossPlatforms,
    platformCount: crossPlatforms.length,
    
    // Username variants
    variants,
    
    // Wayback intelligence
    wayback: waybackData,
    
    // Network intelligence
    network: networkData,
    
    // Google dorks
    dorks,
    
    // Exposure analysis
    exposureScore: exposure.score,
    exposureLevel: exposure.level,
    exposureFactors: exposure.factors,
    
    // Metadata
    timestamp: new Date().toISOString(),
    version: '2.0-advanced'
  });
}
