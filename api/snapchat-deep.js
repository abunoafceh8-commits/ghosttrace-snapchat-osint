const UA_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

async function fetchPage(url, ua = UA_CHROME) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': ua, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow'
    });
    return { status: r.status, text: await r.text() };
  } catch { return { status: 0, text: '' }; }
}

function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (m) try { return JSON.parse(m[1]); } catch {}
  return null;
}

const PLATFORMS = [
  { name: 'Instagram', url: u => `https://www.instagram.com/${u}/`, check: (s,t) => s === 200 && !t.includes('Sorry') },
  { name: 'TikTok', url: u => `https://www.tiktok.com/@${u}`, check: (s) => s === 200 },
  { name: 'X (Twitter)', url: u => `https://x.com/${u}`, check: (s) => s === 200 },
  { name: 'YouTube', url: u => `https://www.youtube.com/@${u}`, check: (s,t) => s === 200 && t.includes('channel') },
  { name: 'Reddit', url: u => `https://www.reddit.com/user/${u}/about.json`, check: (s,t) => s === 200 },
  { name: 'GitHub', url: u => `https://github.com/${u}`, check: (s) => s === 200 },
  { name: 'Twitch', url: u => `https://www.twitch.tv/${u}`, check: (s,t) => s === 200 && !t.includes('Sorry') },
  { name: 'Pinterest', url: u => `https://www.pinterest.com/${u}/`, check: (s,t) => s === 200 && !t.includes('not found') },
  { name: 'Steam', url: u => `https://steamcommunity.com/id/${u}`, check: (s,t) => s === 200 && !t.includes('could not be found') },
  { name: 'SoundCloud', url: u => `https://soundcloud.com/${u}`, check: (s) => s === 200 },
  { name: 'Spotify', url: u => `https://open.spotify.com/user/${u}`, check: (s) => s === 200 },
  { name: 'DeviantArt', url: u => `https://www.deviantart.com/${u}`, check: (s) => s === 200 },
  { name: 'Tumblr', url: u => `https://${u}.tumblr.com`, check: (s) => s === 200 },
  { name: 'Medium', url: u => `https://medium.com/@${u}`, check: (s) => s === 200 },
  { name: 'Flickr', url: u => `https://www.flickr.com/people/${u}/`, check: (s) => s === 200 },
  { name: 'Vimeo', url: u => `https://vimeo.com/${u}`, check: (s) => s === 200 },
  { name: 'Patreon', url: u => `https://www.patreon.com/${u}`, check: (s) => s === 200 },
  { name: 'Roblox', url: u => `https://www.roblox.com/user.aspx?username=${u}`, check: (s,t) => s === 200 && t.includes(u) },
  { name: 'Xbox', url: u => `https://account.xbox.com/profile?gamertag=${u}`, check: (s) => s === 200 },
  { name: 'LinkedIn', url: u => `https://www.linkedin.com/in/${u}/`, check: (s,t) => s === 200 && !t.includes('not found') },
  { name: 'Telegram', url: u => `https://t.me/${u}`, check: (s,t) => s === 200 && !t.includes('you can contact') },
  { name: 'WhatsApp', url: u => `https://wa.me/${u}`, check: (s) => s === 200 },
  { name: 'Keybase', url: u => `https://keybase.io/${u}`, check: (s) => s === 200 },
  { name: 'HackerNews', url: u => `https://news.ycombinator.com/user?id=${u}`, check: (s,t) => s === 200 && t.includes('created') },
  { name: 'GitLab', url: u => `https://gitlab.com/${u}`, check: (s) => s === 200 },
  { name: 'Bitbucket', url: u => `https://bitbucket.org/${u}/`, check: (s) => s === 200 },
  { name: 'Dribbble', url: u => `https://dribbble.com/${u}`, check: (s) => s === 200 },
  { name: 'Behance', url: u => `https://www.behance.net/${u}`, check: (s) => s === 200 },
  { name: 'Kick', url: u => `https://kick.com/${u}`, check: (s) => s === 200 },
  { name: 'Discord', url: u => `https://discord.com/invite/${u}`, check: (s) => s === 200 },
  { name: 'Threads', url: u => `https://www.threads.net/@${u}`, check: (s) => s === 200 },
  { name: 'Mastodon', url: u => `https://mastodon.social/@${u}`, check: (s) => s === 200 },
  { name: 'Lemon8', url: u => `https://www.lemon8-app.com/@${u}`, check: (s) => s === 200 },
  { name: 'Rumble', url: u => `https://rumble.com/c/${u}`, check: (s) => s === 200 },
  { name: 'Odysee', url: u => `https://odysee.com/@${u}`, check: (s) => s === 200 },
];

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const username = (body.username || '').replace('@', '').trim();
  if (!username) return res.status(400).json({ error: 'Username required' });

  // Fetch Snapchat profile page (Chrome UA)
  const [chromePage, mobilePage] = await Promise.all([
    fetchPage(`https://www.snapchat.com/add/${username}`),
    fetchPage(`https://www.snapchat.com/add/${username}`, UA_MOBILE),
  ]);

  let profile = { found: false, username };
  const nextData = extractNextData(chromePage.text);
  
  if (nextData?.props?.pageProps) {
    const pp = nextData.props.pageProps;
    const snapData = pp.snapchatUserInfo || pp.userProfile || {};
    profile = {
      found: true,
      username,
      displayName: snapData.displayName || snapData.display_name || null,
      bitmojiAvatar: snapData.bitmojiAvatar || snapData.bitmoji_avatar || null,
      snapcode: `https://snapcodes.storage.googleapis.com/png/${username}_320_72e4c0e6.png`,
      category: snapData.category || snapData.categoryV2 || null,
      verified: snapData.verified || false,
      createdAt: snapData.createdAt || snapData.created_at || null,
      lastUpdatedAt: snapData.lastUpdatedAt || null,
      storyCount: snapData.stories?.length || 0,
      highlightsCount: snapData.curatedHighlights?.length || 0,
      spotlightCount: snapData.spotlightHighlights?.length || 0,
      relatedAccounts: (snapData.relatedAccounts || []).slice(0, 10),
      sameAsLinks: snapData.sameAsLinks || [],
      raw: snapData
    };
  }

  // Cross-platform check
  const platformResults = await Promise.all(
    PLATFORMS.map(async p => {
      const { status, text } = await fetchPage(p.url(username));
      return { platform: p.name, found: p.check(status, text), url: p.url(username) };
    })
  );

  // Wayback Machine check
  let wayback = { closest: null, totalSnapshots: 0 };
  try {
    const wb = await fetch(`https://archive.org/wayback/available?url=snapchat.com/add/${username}`, { signal: AbortSignal.timeout(5000) });
    const wbd = await wb.json();
    if (wbd.archived_snapshots?.closest) {
      wayback = { closest: wbd.archived_snapshots.closest, totalSnapshots: 1 };
    }
  } catch {}

  // DNS lookup
  let dns = { records: [] };
  try {
    const dnsR = await fetch(`https://dns.google/resolve?name=snapchat.com&type=A`, { signal: AbortSignal.timeout(5000) });
    const dnsData = await dnsR.json();
    dns = { records: (dnsData.Answer || []).map(a => ({ type: 'A', data: a.data, ttl: a.TTL })) };
  } catch {}

  // Google Dorks
  const dorks = [
    { query: `site:snapchat.com "${username}"`, label: 'Snapchat Profile' },
    { query: `"${username}" snapchat`, label: 'General Snapchat' },
    { query: `"${username}" site:instagram.com`, label: 'Instagram' },
    { query: `"${username}" site:twitter.com OR site:x.com`, label: 'Twitter/X' },
    { query: `"${username}" site:tiktok.com`, label: 'TikTok' },
    { query: `"${username}" snapchat story`, label: 'Stories' },
    { query: `"${username}" email OR mail`, label: 'Email' },
    { query: `"${username}" phone OR mobile OR whatsapp`, label: 'Phone' },
    { query: `"${username}" real name OR identity`, label: 'Identity' },
    { query: `intext:"${username}" snapchat leaked`, label: 'Leaks' },
    { query: `"${username}" site:reddit.com`, label: 'Reddit' },
    { query: `"${username}" site:linkedin.com`, label: 'LinkedIn' },
    { query: `cache:snapchat.com/add/${username}`, label: 'Google Cache' },
    { query: `"${username}" filetype:pdf OR filetype:doc`, label: 'Documents' },
    { query: `"${username}" site:facebook.com`, label: 'Facebook' },
    { query: `"${profile.displayName || username}" snapchat`, label: 'Display Name' },
    { query: `snapchat.com/add/${username} inurl:add`, label: 'Direct Link' },
    { query: `"${username}" site:web.archive.org`, label: 'Archives' },
  ];

  // Email candidates
  const emailCandidates = [];
  const providers = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'protonmail.com', 'icloud.com'];
  providers.forEach(p => emailCandidates.push(`${username}@${p}`));
  if (profile.displayName) {
    const clean = profile.displayName.toLowerCase().replace(/\s+/g, '');
    providers.slice(0, 3).forEach(p => emailCandidates.push(`${clean}@${p}`));
  }

  // Username variants
  const variants = [];
  const prefixes = ['', '_', 'x', 'the', 'real', 'its', 'official', 'not'];
  const suffixes = ['', '_', 'x', 'official', 'real', 'snap', 'ttv'];
  prefixes.forEach(pre => {
    suffixes.forEach(suf => {
      const v = `${pre}${username}${suf}`;
      if (v !== username && v.length > 2) variants.push(v);
    });
  });

  // Exposure score
  const foundPlatforms = platformResults.filter(p => p.found).length;
  const exposureScore = Math.min(100, (foundPlatforms * 4) + (profile.found ? 20 : 0) + (wayback.closest ? 10 : 0));

  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.json({
    profile,
    platforms: platformResults,
    platformsFound: platformResults.filter(p => p.found),
    wayback,
    dns,
    dorks: dorks.map(d => ({ ...d, url: `https://www.google.com/search?q=${encodeURIComponent(d.query)}` })),
    emailCandidates,
    usernameVariants: variants.slice(0, 30),
    exposureScore,
    riskFactors: {
      platformCount: foundPlatforms,
      archived: !!wayback.closest,
      displayNameExposed: !!profile.displayName,
      storiesPublic: (profile.storyCount || 0) > 0,
    }
  });
}
