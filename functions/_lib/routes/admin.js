import { Hono } from 'hono';
import { authenticate, requireRole } from '../auth.js';
import { writeAuditLog } from '../audit.js';
import { slugify } from '../helpers.js';
import { getCharityRaised, getCharityRaisedMap } from '../charityRollup.js';

const admin = new Hono();
admin.use('*', authenticate, requireRole('ADMIN'));

// Known SiteSetting keys and their validators. PUT rejects anything not
// listed here — a typo'd key should fail loudly, not silently create a
// setting nothing reads.
const SETTING_VALIDATORS = {
  charity_pct: async (value, prisma) => {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) return 'Must be a non-negative number';
    const otherRow = await prisma.siteSetting.findUnique({ where: { key: 'platform_pct' } });
    const other = typeof otherRow?.value === 'number' ? otherRow.value : 0.10;
    if (value + other > 1) return `charity_pct + platform_pct cannot exceed 1 (platform_pct is currently ${other}) — the artist share would go negative`;
    return null;
  },
  platform_pct: async (value, prisma) => {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) return 'Must be a non-negative number';
    const otherRow = await prisma.siteSetting.findUnique({ where: { key: 'charity_pct' } });
    const other = typeof otherRow?.value === 'number' ? otherRow.value : 0.10;
    if (value + other > 1) return `charity_pct + platform_pct cannot exceed 1 (charity_pct is currently ${other}) — the artist share would go negative`;
    return null;
  },
  site_name: async (value) => (typeof value === 'string' && value.trim()) ? null : 'Must be a non-empty string',
  tagline: async (value) => (typeof value === 'string' && value.trim()) ? null : 'Must be a non-empty string',
  footer_copyright: async (value) => (typeof value === 'string' && value.trim()) ? null : 'Must be a non-empty string',
  contact_email: async (value) => (typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ? null : 'Must be a valid email address',
  maintenance_mode: async (value) => (typeof value === 'boolean') ? null : 'Must be true or false',
  maintenance_message: async (value) => (typeof value === 'string') ? null : 'Must be a string',
  show_homepage_stats: async (value) => (typeof value === 'boolean') ? null : 'Must be true or false',
  theory_if: async (value) => (typeof value === 'string' && value.trim()) ? null : 'Must be a non-empty string',
  theory_and_if: async (value) => (typeof value === 'string' && value.trim()) ? null : 'Must be a non-empty string',
  theory_then: async (value) => (typeof value === 'string' && value.trim()) ? null : 'Must be a non-empty string',
  // null is valid here — it's how a logo gets unset to fall back to the
  // text wordmark, not just how it gets set.
  site_logo_url: async (value) => (value === null || (typeof value === 'string' && /^https?:\/\//.test(value))) ? null : 'Must be a valid URL or null',
  // Top announcement bar. Link fields are deliberately lenient (not
  // required to be a real https URL) — "#" is a valid placeholder until
  // admin has the real destination.
  contact_phone: async (value) => (typeof value === 'string' && value.trim()) ? null : 'Must be a non-empty string',
  announcement_message: async (value) => (typeof value === 'string') ? null : 'Must be a string',
  social_instagram_url: async (value) => (typeof value === 'string') ? null : 'Must be a string',
  social_facebook_url: async (value) => (typeof value === 'string') ? null : 'Must be a string',
  social_twitter_url: async (value) => (typeof value === 'string') ? null : 'Must be a string',
  trustpilot_url: async (value) => (typeof value === 'string') ? null : 'Must be a string',
  google_review_url: async (value) => (typeof value === 'string') ? null : 'Must be a string',
  // Homepage hero background. URL fields follow the same null-or-URL
  // pattern as site_logo_url — null is how a field gets unset, not just
  // how it starts, so the hero can fall back to the built-in default.
  hero_media_type: async (value) => (value === null || value === 'video' || value === 'image') ? null : 'Must be "video", "image", or null',
  hero_video_url: async (value) => (value === null || (typeof value === 'string' && /^https?:\/\/.+\.(mp4|webm|ogg)(\?.*)?$/i.test(value))) ? null : 'Must be a direct link to an .mp4/.webm/.ogg file (not a YouTube/Vimeo page URL) or null',
  hero_poster_url: async (value) => (value === null || (typeof value === 'string' && /^https?:\/\//.test(value))) ? null : 'Must be a valid URL or null',
  hero_image_url: async (value) => (value === null || (typeof value === 'string' && /^https?:\/\//.test(value))) ? null : 'Must be a valid URL or null',
  // Homepage Theory of Change background — same null-or-URL pattern as the
  // hero image fields above.
  theory_bg_image: async (value) => (value === null || (typeof value === 'string' && /^https?:\/\//.test(value))) ? null : 'Must be a valid URL or null',
};

admin.get('/users', async (c) => {
  const prisma = c.get('prisma');
  try {
    const q = c.req.query();
    const { role, search } = q;
    const page = q.page || 1, limit = q.limit || 20;
    const where = {};
    if (role) where.role = role;
    if (search) where.OR = [{ email: { contains: search, mode: 'insensitive' } }, { firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }];
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip: (page - 1) * limit, take: parseInt(limit), orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, emailVerified: true, createdAt: true, artistProfile: { select: { displayName: true, verified: true } }, charityProfile: { select: { name: true, verified: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return c.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.patch('/users/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const { role } = await c.req.json();
    const before = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!before) return c.json({ error: 'Not found' }, 404);
    const data = {};
    if (role) data.role = role;
    const user = await prisma.user.update({ where: { id }, data });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'user.role_change', targetType: 'User', targetId: id, before, after: { role: user.role } });
    return c.json(user);
  } catch (e) { return c.json({ error: 'Update failed' }, 500); }
});

admin.post('/verify-artist/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const before = await prisma.artistProfile.findUnique({ where: { id }, select: { verified: true } });
    if (!before) return c.json({ error: 'Not found' }, 404);
    const profile = await prisma.artistProfile.update({ where: { id }, data: { verified: true } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'artist.verify', targetType: 'ArtistProfile', targetId: id, before, after: { verified: profile.verified } });
    return c.json({ message: 'Artist verified', profile });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// ─── Artist images (profile picture + banner) ───────────────────────────
admin.get('/artists', async (c) => {
  const prisma = c.get('prisma');
  try {
    const q = c.req.query();
    const page = Math.max(1, parseInt(q.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(q.limit) || 20));
    const where = q.search ? { displayName: { contains: q.search, mode: 'insensitive' } } : {};
    const [items, total] = await Promise.all([
      prisma.artistProfile.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { displayName: 'asc' },
        select: { id: true, displayName: true, avatarUrl: true, bannerUrl: true, location: true, verified: true, user: { select: { email: true } }, _count: { select: { products: true } } },
      }),
      prisma.artistProfile.count({ where }),
    ]);
    return c.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// Empty string / null clears an image (public pages then show the generated
// placeholder); anything else must be an http(s) URL.
admin.patch('/artists/:id/images', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const data = {};
    for (const k of ['avatarUrl', 'bannerUrl']) {
      if (body[k] === undefined) continue;
      const v = body[k] === '' ? null : body[k];
      if (v !== null && !(typeof v === 'string' && /^https?:\/\/\S+$/.test(v))) return c.json({ error: `${k} must be an http(s) URL or empty` }, 400);
      data[k] = v;
    }
    if (!Object.keys(data).length) return c.json({ error: 'Nothing to update' }, 400);
    const before = await prisma.artistProfile.findUnique({ where: { id }, select: { avatarUrl: true, bannerUrl: true } });
    if (!before) return c.json({ error: 'Not found' }, 404);
    const profile = await prisma.artistProfile.update({ where: { id }, data, select: { id: true, displayName: true, avatarUrl: true, bannerUrl: true } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'artist.update_images', targetType: 'ArtistProfile', targetId: id, before, after: { avatarUrl: profile.avatarUrl, bannerUrl: profile.bannerUrl } });
    return c.json(profile);
  } catch (e) { return c.json({ error: 'Update failed' }, 500); }
});

admin.post('/verify-charity/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const before = await prisma.charityProfile.findUnique({ where: { id }, select: { verified: true } });
    if (!before) return c.json({ error: 'Not found' }, 404);
    const profile = await prisma.charityProfile.update({ where: { id }, data: { verified: true } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'charity.verify', targetType: 'CharityProfile', targetId: id, before, after: { verified: profile.verified } });
    return c.json({ message: 'Charity verified', profile });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.get('/moderation', async (c) => {
  const prisma = c.get('prisma');
  try {
    const [pendingArtists, pendingCharities, draftProducts, pendingDocuments] = await Promise.all([
      prisma.artistProfile.findMany({ where: { verified: false }, include: { user: { select: { email: true, firstName: true, lastName: true } } } }),
      prisma.charityProfile.findMany({ where: { verified: false }, include: { user: { select: { email: true } } } }),
      prisma.product.findMany({ where: { status: 'DRAFT' }, include: { artist: { select: { displayName: true } } }, take: 20 }),
      prisma.charityDocument.findMany({ where: { reviewStatus: 'PENDING' }, include: { charity: { select: { name: true } } }, orderBy: { uploadedAt: 'asc' } }),
    ]);
    return c.json({ pendingArtists, pendingCharities, draftProducts, pendingDocuments });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.patch('/charity-documents/:id/review', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const { status, note } = await c.req.json();
    if (!['APPROVED', 'REJECTED'].includes(status)) return c.json({ error: 'status must be APPROVED or REJECTED' }, 400);
    const before = await prisma.charityDocument.findUnique({ where: { id }, select: { reviewStatus: true, reviewedBy: true, reviewedAt: true, reviewNote: true } });
    if (!before) return c.json({ error: 'Not found' }, 404);
    const doc = await prisma.charityDocument.update({
      where: { id },
      data: { reviewStatus: status, reviewedBy: c.get('userId'), reviewedAt: new Date(), reviewNote: note || null },
    });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'charity_document.review', targetType: 'CharityDocument', targetId: id, before, after: { reviewStatus: doc.reviewStatus, reviewedBy: doc.reviewedBy, reviewNote: doc.reviewNote } });
    return c.json(doc);
  } catch (e) { return c.json({ error: 'Update failed' }, 500); }
});

// Full catalog view across every status (public GET /products only ever
// returns ACTIVE) — this is what AdminProductManager.jsx's list lives on.
admin.get('/products', async (c) => {
  const prisma = c.get('prisma');
  try {
    const q = c.req.query();
    const { status, category, search } = q;
    const page = q.page || 1, limit = q.limit || 50;
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) where.title = { contains: search, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where, skip: (page - 1) * limit, take: parseInt(limit), orderBy: { createdAt: 'desc' },
        include: { artist: { select: { displayName: true } }, charity: { select: { name: true } }, _count: { select: { orderItems: true } } },
      }),
      prisma.product.count({ where }),
    ]);
    return c.json({ items, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.patch('/products/:id/moderate', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();
    const before = await prisma.product.findUnique({ where: { id }, select: { status: true } });
    if (!before) return c.json({ error: 'Not found' }, 404);
    const product = await prisma.product.update({ where: { id }, data: { status } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'product.status_change', targetType: 'Product', targetId: id, before, after: { status: product.status } });
    return c.json(product);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.get('/settings', async (c) => {
  const prisma = c.get('prisma');
  try {
    const rows = await prisma.siteSetting.findMany();
    const map = {};
    for (const r of rows) map[r.key] = r.value;
    return c.json(map);
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.put('/settings/:key', async (c) => {
  const prisma = c.get('prisma');
  try {
    const key = c.req.param('key');
    const validate = SETTING_VALIDATORS[key];
    if (!validate) return c.json({ error: `Unknown setting key: ${key}` }, 400);
    const { value } = await c.req.json();
    const validationError = await validate(value, prisma);
    if (validationError) return c.json({ error: validationError }, 400);
    const before = await prisma.siteSetting.findUnique({ where: { key } });
    const row = await prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'setting.update', targetType: 'SiteSetting', targetId: key, before: before ? { value: before.value } : null, after: { value: row.value } });
    return c.json(row);
  } catch (e) { return c.json({ error: 'Update failed' }, 500); }
});

// ─── Projects (campaigns) ───────────────────────────────────────────────
// raisedAmount is deliberately NOT writable here: it is owned by the
// payment/donation flow (not built yet), and an admin hand-editing it would
// silently change the derived charity rollup.
const PROJECT_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];
const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\/\S+$/.test(v);
const toJson = (x) => JSON.parse(JSON.stringify(x));

// Validates a create (full) or edit (partial) body; returns { error } or { data }.
async function parseProjectBody(prisma, body, { partial }) {
  const data = {};
  const has = (k) => body[k] !== undefined;
  const need = (k) => !partial && !has(k);

  if (has('title') || need('title')) {
    if (typeof body.title !== 'string' || !body.title.trim()) return { error: 'Title is required' };
    data.title = body.title.trim();
  }
  if (has('story') || need('story')) {
    if (typeof body.story !== 'string' || !body.story.trim()) return { error: 'Story is required' };
    data.story = body.story;
  }
  if (has('charityId') || need('charityId')) {
    if (typeof body.charityId !== 'string' || !(await prisma.charityProfile.findUnique({ where: { id: body.charityId }, select: { id: true } }))) return { error: 'Choose a valid charity' };
    data.charityId = body.charityId;
  }
  if (has('targetAmount') || need('targetAmount')) {
    const n = Number(body.targetAmount);
    if (body.targetAmount === '' || body.targetAmount === null || !isFinite(n) || n <= 0 || n >= 1e10) return { error: 'Target amount must be a number greater than 0' };
    data.targetAmount = n.toFixed(2);
  }
  if (has('status')) {
    if (!PROJECT_STATUSES.includes(body.status)) return { error: `Status must be one of ${PROJECT_STATUSES.join(', ')}` };
    data.status = body.status;
  }
  if (has('sdgIds')) {
    if (!Array.isArray(body.sdgIds) || !body.sdgIds.every(n => Number.isInteger(n) && n >= 1 && n <= 17)) return { error: 'sdgIds must be integers 1-17' };
    data.sdgIds = [...new Set(body.sdgIds)].sort((a, b) => a - b);
  }
  for (const k of ['headerImage', 'campaignVideo']) {
    if (has(k)) {
      const v = body[k] === '' ? null : body[k];
      if (v !== null && !isHttpUrl(v)) return { error: `${k} must be an http(s) URL or empty` };
      data[k] = v;
    }
  }
  for (const k of ['startDate', 'endDate']) {
    if (has(k)) {
      if (body[k] === null || body[k] === '') data[k] = null;
      else { const d = new Date(body[k]); if (isNaN(d)) return { error: `${k} is not a valid date` }; data[k] = d; }
    }
  }
  if (has('slug')) {
    const s = slugify(String(body.slug));
    if (!s) return { error: 'Invalid slug' };
    data.slug = s;
  }
  return { data };
}

async function uniqueProjectSlug(prisma, base, exceptId) {
  let slug = base || 'campaign';
  const clash = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== exceptId) slug += '-' + Date.now().toString(36);
  return slug;
}

admin.post('/projects', async (c) => {
  const prisma = c.get('prisma');
  try {
    const body = await c.req.json().catch(() => ({}));
    const { error, data } = await parseProjectBody(prisma, body, { partial: false });
    if (error) return c.json({ error }, 400);
    data.slug = await uniqueProjectSlug(prisma, data.slug || slugify(data.title));
    if (data.startDate && data.endDate && data.endDate < data.startDate) return c.json({ error: 'End date must be after start date' }, 400);
    const project = await prisma.project.create({ data, include: { charity: { select: { id: true, name: true } } } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'project.create', targetType: 'Project', targetId: project.id, after: toJson(project) });
    return c.json(project, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Create failed' }, 500); }
});

admin.get('/projects', async (c) => {
  const prisma = c.get('prisma');
  try {
    const q = c.req.query();
    const page = Math.max(1, parseInt(q.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(q.limit) || 20));
    const where = {};
    if (q.status && PROJECT_STATUSES.includes(q.status)) where.status = q.status;
    if (q.charityId) where.charityId = q.charityId;
    if (q.search) where.title = { contains: q.search, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { charity: { select: { id: true, name: true } }, _count: { select: { products: true } } },
      }),
      prisma.project.count({ where }),
    ]);
    // Derived charity total (sum of ALL that charity's projects, not just
    // this page/filter) — the same figure the public side will use.
    const raisedByCharity = await getCharityRaisedMap(prisma, [...new Set(items.map(p => p.charityId))]);
    return c.json({ items: items.map(p => ({ ...p, charityRaised: raisedByCharity[p.charityId] ?? 0 })), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.get('/projects/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const project = await prisma.project.findUnique({
      where: { id: c.req.param('id') },
      include: {
        charity: { select: { id: true, name: true } },
        products: { orderBy: { createdAt: 'desc' }, select: { id: true, title: true, slug: true, status: true, category: true, basePrice: true, images: true, artist: { select: { displayName: true } } } },
      },
    });
    if (!project) return c.json({ error: 'Not found' }, 404);
    return c.json({ ...project, charityRaised: await getCharityRaised(prisma, project.charityId) });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.patch('/projects/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const before = await prisma.project.findUnique({ where: { id } });
    if (!before) return c.json({ error: 'Not found' }, 404);
    const body = await c.req.json().catch(() => ({}));
    const { error, data } = await parseProjectBody(prisma, body, { partial: true });
    if (error) return c.json({ error }, 400);
    if (data.slug) data.slug = await uniqueProjectSlug(prisma, data.slug, id);
    const start = data.startDate !== undefined ? data.startDate : before.startDate;
    const end = data.endDate !== undefined ? data.endDate : before.endDate;
    if (start && end && end < start) return c.json({ error: 'End date must be after start date' }, 400);
    if (!Object.keys(data).length) return c.json({ error: 'Nothing to update' }, 400);
    const project = await prisma.project.update({ where: { id }, data, include: { charity: { select: { id: true, name: true } } } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'project.update', targetType: 'Project', targetId: id, before: toJson(before), after: toJson(project) });
    return c.json(project);
  } catch (e) { console.error(e); return c.json({ error: 'Update failed' }, 500); }
});

admin.delete('/projects/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const before = await prisma.project.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!before) return c.json({ error: 'Not found' }, 404);
    // A campaign that has taken money is a financial record — archive it
    // instead of destroying the history.
    if (Number(before.raisedAmount) > 0) return c.json({ error: 'This campaign has recorded donations — set its status to ARCHIVED instead of deleting it' }, 409);
    // Product.projectId is ON DELETE SET NULL, so linked artworks survive
    // and are simply unlinked.
    await prisma.project.delete({ where: { id } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'project.delete', targetType: 'Project', targetId: id, before: toJson(before) });
    return c.json({ message: 'Deleted', unlinkedProducts: before._count.products });
  } catch (e) { return c.json({ error: 'Delete failed' }, 500); }
});

// Link / unlink an artwork. Dedicated routes (rather than the generic
// product PATCH) so each change is audited.
admin.post('/projects/:id/products', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id');
    const { productId } = await c.req.json().catch(() => ({}));
    if (typeof productId !== 'string') return c.json({ error: 'productId required' }, 400);
    const [project, product] = await Promise.all([
      prisma.project.findUnique({ where: { id }, select: { id: true } }),
      prisma.product.findUnique({ where: { id: productId }, select: { id: true, projectId: true } }),
    ]);
    if (!project) return c.json({ error: 'Project not found' }, 404);
    if (!product) return c.json({ error: 'Product not found' }, 404);
    await prisma.product.update({ where: { id: productId }, data: { projectId: id } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'project.link_product', targetType: 'Project', targetId: id, before: { productId, projectId: product.projectId }, after: { productId, projectId: id } });
    return c.json({ ok: true });
  } catch (e) { return c.json({ error: 'Link failed' }, 500); }
});

admin.delete('/projects/:id/products/:productId', async (c) => {
  const prisma = c.get('prisma');
  try {
    const id = c.req.param('id'), productId = c.req.param('productId');
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { projectId: true } });
    if (!product || product.projectId !== id) return c.json({ error: 'That product is not linked to this project' }, 404);
    await prisma.product.update({ where: { id: productId }, data: { projectId: null } });
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'project.unlink_product', targetType: 'Project', targetId: id, before: { productId, projectId: id }, after: { productId, projectId: null } });
    return c.json({ ok: true });
  } catch (e) { return c.json({ error: 'Unlink failed' }, 500); }
});

// ─── Newsletter ─────────────────────────────────────────────────────────
admin.get('/newsletter', async (c) => {
  const prisma = c.get('prisma');
  try {
    const q = c.req.query();
    const page = Math.max(1, parseInt(q.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(q.limit) || 25));
    const [items, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.newsletterSubscriber.count(),
    ]);
    return c.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// Emails are validated at signup, but a leading = + - @ would still be
// evaluated as a formula if the CSV is opened in a spreadsheet, so such
// cells are prefixed with a single quote.
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

admin.get('/newsletter/export', async (c) => {
  const prisma = c.get('prisma');
  try {
    const rows = await prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: 'desc' } });
    const lines = ['email,source,date', ...rows.map(r => [r.email, r.source, r.createdAt.toISOString()].map(csvCell).join(','))];
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(lines.join('\r\n') + '\r\n', {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="newsletter-subscribers-${stamp}.csv"`,
      },
    });
  } catch (e) { return c.json({ error: 'Export failed' }, 500); }
});

// ─── Orders ─────────────────────────────────────────────────────────────
// GET /orders and GET /orders/:id in orders.js are hard-scoped to the
// requesting buyer (buyerId in the where clause) — there's no way for an
// admin to see any order but their own through them. These bypass that
// scoping entirely; access is already gated by the router-wide
// requireRole('ADMIN') at the top of this file.
admin.get('/orders', async (c) => {
  const prisma = c.get('prisma');
  try {
    const q = c.req.query();
    const { status, buyerEmail, dateFrom, dateTo } = q;
    const page = q.page || 1, limit = q.limit || 20;
    const where = {};
    if (status) where.status = status;
    if (buyerEmail) where.buyerEmail = { contains: buyerEmail, mode: 'insensitive' };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
    }
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where, skip: (page - 1) * limit, take: parseInt(limit), orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { firstName: true, lastName: true, email: true } },
          items: { take: 1, select: { product: { select: { title: true, images: true } } } },
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return c.json({ items, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.get('/orders/:id', async (c) => {
  const prisma = c.get('prisma');
  try {
    const order = await prisma.order.findUnique({
      where: { id: c.req.param('id') },
      include: {
        buyer: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        items: {
          include: {
            product: { select: { title: true, images: true, slug: true, category: true, artist: { select: { displayName: true } }, charity: { select: { name: true } } } },
            variation: true,
          },
        },
      },
    });
    if (!order) return c.json({ error: 'Order not found' }, 404);
    // artistPayout is never persisted (see split.js) — derived per line the
    // same way order creation computes it: the remainder of the LINE TOTAL
    // (unitPrice × quantity, which is what charitySplitAmt/platformFeeAmt
    // were split from) after subtracting both, never unitPrice alone.
    const items = order.items.map(item => {
      const lineTotal = Number(item.unitPrice) * item.quantity;
      const artistPayout = Math.round((lineTotal - Number(item.charitySplitAmt) - Number(item.platformFeeAmt) + Number.EPSILON) * 100) / 100;
      return { ...item, lineTotal, artistPayout };
    });
    return c.json({ ...order, items });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

admin.get('/analytics', async (c) => {
  const prisma = c.get('prisma');
  try {
    const [usersByRole, ordersByStatus, topArtists, topCharities, recentOrders] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.order.groupBy({ by: ['status'], _count: true, _sum: { totalAmount: true } }),
      prisma.artistProfile.findMany({ orderBy: { totalSold: 'desc' }, take: 5, select: { displayName: true, totalSold: true, artworkCount: true, verified: true } }),
      prisma.charityProfile.findMany({ orderBy: { raised: 'desc' }, take: 5, select: { name: true, raised: true, funderCount: true } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { buyer: { select: { email: true, firstName: true } }, _count: { select: { items: true } } } }),
    ]);
    return c.json({ usersByRole, ordersByStatus, topArtists, topCharities, recentOrders });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default admin;
