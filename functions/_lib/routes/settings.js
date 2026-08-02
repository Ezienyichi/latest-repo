import { Hono } from 'hono';

const settings = new Hono();

// Public, read-only subset of SiteSetting — safe for any visitor to see.
// Keeps the split rates admin-editable (via /api/admin/settings) while
// letting unauthenticated pages (checkout) show the real numbers instead
// of a guess baked into the frontend.
const PUBLIC_KEYS = [
  'charity_pct', 'platform_pct', 'theory_if', 'theory_and_if', 'theory_then', 'site_name', 'site_logo_url',
  // Top announcement bar — all admin-editable, see admin.js SETTING_VALIDATORS.
  'contact_email', 'contact_phone', 'announcement_message',
  'social_instagram_url', 'social_facebook_url', 'social_twitter_url',
  'trustpilot_url', 'google_review_url',
  // Homepage hero background — video or image, admin-editable.
  'hero_media_type', 'hero_video_url', 'hero_poster_url', 'hero_image_url',
  // Homepage Theory of Change section — full-bleed background image, admin-editable.
  'theory_bg_image',
];
const DEFAULTS = {
  charity_pct: 0.10,
  platform_pct: 0.10,
  theory_if: 'If talented creatives are provided with a trusted platform to commercialize their creative work while partnering with credible charitable organizations and community initiatives,',
  theory_and_if: 'and if consumers, businesses, philanthropists, and corporate partners are given transparent opportunities to purchase creative products that directly finance SDG-aligned projects,',
  theory_then: 'then creative commerce can become a sustainable source of philanthropic capital that strengthens nonprofit organizations, empowers creative entrepreneurs, and delivers measurable improvements in communities across the world.',
  site_name: 'FastTackle Africa',
  // Unset until a real logo exists — the Wordmark component falls back to
  // the text name whenever this is null, so nothing breaks by leaving it.
  site_logo_url: null,
  contact_email: 'hello@fasttackle.africa',
  contact_phone: '+44 20 1234 5678',
  announcement_message: 'Mon–Fri, 9am–6pm GMT · Worldwide Shipping & Digital Delivery',
  social_instagram_url: '#',
  social_facebook_url: '#',
  social_twitter_url: '#',
  trustpilot_url: '#',
  google_review_url: '#',
  // Unset by default — the hero falls back to the existing hardcoded
  // video until admin explicitly picks a mode and sets a URL.
  hero_media_type: null,
  hero_video_url: null,
  hero_poster_url: null,
  hero_image_url: null,
  // Unset by default — falls back to the hardcoded placeholder image in
  // HomePage.jsx until admin picks a real one.
  theory_bg_image: null,
};

settings.get('/public', async (c) => {
  const prisma = c.get('prisma');
  try {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: PUBLIC_KEYS } } });
    const map = { ...DEFAULTS };
    for (const r of rows) if (typeof r.value === 'number' || typeof r.value === 'string') map[r.key] = r.value;
    return c.json(map);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default settings;
