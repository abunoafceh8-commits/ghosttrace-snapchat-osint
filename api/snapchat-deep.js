// GhostTrace Snapchat OSINT - Advanced Deep Intelligence
// Multi-layer analysis with cross-platform correlation

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Snapchat deep profile extraction
async function getSnapchatProfile(username) {
  const profile = {
    found: false,
    username,
    displayName: '',
    bio: '',
    profilePicture: '',
    bitmoji: '',
    accountType: '',
    isVerified: false,
    isPublic: false,
    hasStory: false,
    subscriberCount: 0,
    location: '',
    website: '',
    endpoints: {},
    metadata: {}
  };
  
  try {
    // Method 1: Snapchat Stories API
    const storiesUrl = `https://story.snapchat.com/@${username}`;
    const r1 = await fetch(storiesUrl, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (r1.ok) {
      const html = await r1.text();
      profile.found = true;
      
      // Extract JSON-LD data
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      if (jsonLdMatch) {
        try {
          const jsonLd = JSON.parse(jsonLdMatch[1]);
          profile.displayName = jsonLd.name || username;
          profile.bio = jsonLd.description || '';
          profile.profilePicture = jsonLd.image || '';
          profile.accountType = jsonLd['@type'] || 'Person';
        } catch {}
      }
      
      // Extract meta tags
      const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/);
      const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/);
      const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/);
      
      if (ogTitle) profile.displayName = ogTitle[1];
      if (ogDesc) profile.bio = ogDesc[1];
      if (ogImage) profile.bitmoji = ogImage[1];
      
      // Check for story availability
      profile.hasStory = html.includes('story') || html.includes('Spotlight');
      profile.isPublic = true; // If we can access, it's public
      
      profile.endpoints.stories = storiesUrl;
    }
    
    // Method 2: Snapchat Spotlight
    const spotlightUrl = `https://www.snapchat.com/spotlight/${username}`;
    try {
      const r2 = await fetch(spotlightUrl, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(5000)
      });
      if (r2.ok) {
        profile.endpoints.spotlight = spotlightUrl;
      }
    } catch {}
    
    // Method 3: Public profile
    const profileUrl = `https://www.snapchat.com/add/${username}`;
    try {
      const r3 = await fetch(profileUrl, {
        headers: { 'User-Agent': UA },
        redirect: 'manual',
        signal: AbortSignal.timeout(5000)
      });
      if (r3.status === 200 || r3.status === 301) {
        profile.endpoints.profile = profileUrl;
      }
    } catch {}
    
  } catch (e) {
    profile.error = e.message;
  }
  
  return profile;
}

// Advanced cross-platform username search
async function crossPlatformSearch(username) {
  const platforms = [
    // Social Media
    { name: 'Instagram', url: `https://www.instagram.com/${username}/`, category: 'social' },
    { name: 'Twitter', url: `https://twitter.com/${username}`, category: 'social' },
    { name: 'Facebook', url: `https://www.facebook.com/${username}`, category: 'social' },
    { name: 'TikTok', url: `https://www.tiktok.com/@${username}`, category: 'social' },
    { name: 'LinkedIn', url: `https://www.linkedin.com/in/${username}`, category: 'professional' },
    
    // Content
    { name: 'YouTube', url: `https://www.youtube.com/@${username}`, category: 'content' },
    { name: 'Reddit', url: `https://www.reddit.com/user/${username}`, category: 'content' },
    { name: 'Medium', url: `https://medium.com/@${username}`, category: 'content' },
    { name: 'Flickr', url: `https://www.flickr.com/people/${username}`, category: 'content' },
    
    // Gaming
    { name: 'Twitch', url: `https://www.twitch.tv/${username}`, category: 'gaming' },
    { name: 'Steam', url: `https://steamcommunity.com/id/${username}`, category: 'gaming' },
    
    // Professional
    { name: 'GitHub', url: `https://github.com/${username}`, category: 'professional' },
    { name: 'GitLab', url: `https://gitlab.com/${username}`, category: 'professional' },
    { name: 'Behance', url: `https://www.behance.net/${username}`, category: 'professional' },
    
    // Other
    { name: 'Pinterest', url: `https://www.pinterest.com/${username}`, category: 'other' },
    { name: 'SoundCloud', url: `https://soundcloud.com/${username}`, category: 'other' },
    { name: 'Spotify', url: `https://open.spotify.com/user/${username}`, category: 'other' },
  ];
  
  const results = await Promise.allSettled(
    platforms.map(async (p) => {
      try {
        const r = await fetch(p.url, {
          method: 'HEAD',
          headers: { 'User-Agent': UA },
          redirect: 'follow',
          signal: AbortSignal.timeout(5000)
        });
        
        const found = r.status === 200 || (r.status >= 300 && r.status < 400);
        
        return {
          platform: p.name,
          url: p.url,
          found,
          status: r.status,
          category: p.category,
          responseTime: 0
        };
      } catch {
        return {
          platform: p.name,
          url: p.url,
          found: false,
          status: 0,
          category: p.category
        };
      }
    })
  );
  
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value)
    .filter(r => r.found);
}

// Google Dork queries generation
function generateDorks(username, email) {
  return [
    {
      name: 'General Search',
      query: `"${username}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`"${username}"`)}`
    },
    {
      name: 'Social Media',
      query: `site:instagram.com OR site:twitter.com OR site:facebook.com "${username}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:instagram.com OR site:twitter.com OR site:facebook.com "${username}"`)}`
    },
    {
      name: 'Email Search',
      query: `"${email || username + '@'}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`"${email || username + '@'}"`)}`
    },
    {
      name: 'File Search',
      query: `filetype:pdf OR filetype:doc OR filetype:docx "${username}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`filetype:pdf OR filetype:doc OR filetype:docx "${username}"`)}`
    },
    {
      name: 'Forum Search',
      query: `site:reddit.com OR site:forum.com OR site:stackoverflow.com "${username}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:reddit.com OR site:forum.com OR site:stackoverflow.com "${username}"`)}`
    },
    {
      name: 'Pastebin Leaks',
      query: `site:pastebin.com "${username}" OR "${email}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:pastebin.com "${username}" OR "${email}"`)}`
    },
    {
      name: 'Image Search',
      query: `"${username}" site:flickr.com OR site:imgur.com OR site:500px.com`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`"${username}" site:flickr.com OR site:imgur.com OR site:500px.com`)}`
    },
    {
      name: 'Username Variations',
      query: `"${username}" OR "${username}_" OR "_${username}" OR "${username}123"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`"${username}" OR "${username}_" OR "_${username}" OR "${username}123"`)}`
    },
  ];
}

// Wayback Machine deep search
async function waybackSearch(username) {
  const results = {
    snapchat: { snapshots: 0, earliest: null, latest: null },
    related: []
  };
  
  try {
    // Check Snapchat profile in Wayback
    const r = await fetch(`https://web.archive.org/cdx/search/cdx?url=snapchat.com/add/${username}*&output=json&limit=50&fl=timestamp,original,statuscode&collapse=urlkey`, {
      signal: AbortSignal.timeout(10000)
    });
    
    if (r.ok) {
      const data = await r.json();
      const [, ...rows] = data;
      
      results.snapchat.snapshots = rows.length;
      if (rows.length > 0) {
        results.snapchat.earliest = rows[0][0];
        results.snapchat.latest = rows[rows.length - 1][0];
      }
    }
  } catch {}
  
  return results;
}

// Network intelligence
async function networkIntel(username) {
  const intel = {
    domains: [],
    ips: [],
    hosting: null,
    certificates: []
  };
  
  try {
    // Check if username has personal website
    const possibleDomains = [
      `${username}.com`,
      `${username}.net`,
      `${username}.io`,
      `${username}.me`,
    ];
    
    for (const domain of possibleDomains) {
      try {
        const r = await fetch(`https://dns.google/resolve?name=${domain}&type=A`, {
          signal: AbortSignal.timeout(3000)
        });
        if (r.ok) {
          const data = await r.json();
          if (data.Answer && data.Answer.length > 0) {
            intel.domains.push(domain);
            intel.ips.push(...data.Answer.map(a => a.data));
          }
        }
      } catch {}
    }
  } catch {}
  
  return intel;
}

// Exposure scoring algorithm
function calculateExposureScore(profile, platforms, wayback, network) {
  let score = 0;
  const factors = [];
  
  // Profile exposure
  if (profile.found) {
    score += 20;
    factors.push('Snapchat profile found');
  }
  if (profile.isPublic) {
    score += 15;
    factors.push('Public profile');
  }
  if (profile.hasStory) {
    score += 10;
    factors.push('Active stories');
  }
  
  // Cross-platform presence
  const platformScore = Math.min(30, platforms.length * 3);
  score += platformScore;
  if (platforms.length > 5) {
    factors.push(`Present on ${platforms.length} platforms`);
  }
  
  // Historical presence
  if (wayback.snapchat.snapshots > 0) {
    score += 10;
    factors.push(`${wayback.snapchat.snapshots} archived snapshots`);
  }
  
  // Network footprint
  if (network.domains.length > 0) {
    score += 15;
    factors.push('Personal domains found');
  }
  
  return {
    score: Math.min(100, score),
    level: score > 70 ? 'HIGH' : score > 40 ? 'MEDIUM' : 'LOW',
    factors
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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
