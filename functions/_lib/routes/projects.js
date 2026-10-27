import { Hono } from 'hono';
import { getCharityRaised } from '../charityRollup.js';

const projects = new Hono();

// Public visibility: ACTIVE campaigns are live; COMPLETED ones stay visible
// as "funded". DRAFT and ARCHIVED never leave the admin panel — they 404.
const PUBLIC_STATUSES = ['ACTIVE', 'COMPLETED'];

const CHARITY_CARD = { id: true, name: true, logo: true, verified: true };

// Explicit field list (not `include`) so private columns — fileUrl, sku,
// certificateId, upsell ids — can never reach the public response.
const PRODUCT_CARD = {
  id: true, slug: true, title: true, category: true, editionType: true, productType: true,
  basePrice: true, comparePrice: true, estimatedValue: true, medium: true, images: true, sdgIds: true,
  artist: { select: { id: true, displayName: true, avatarUrl: true, verified: true } },
  charity: { select: { id: true, name: true } },
};

projects.get('/', async (c) => {
  const prisma = c.get('prisma');
  try {
    const q = c.req.query();
    const status = q.status || 'ACTIVE';
    if (!PUBLIC_STATUSES.includes(status)) return c.json({ error: 'status must be ACTIVE or COMPLETED' }, 400);
    const page = Math.max(1, parseInt(q.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(q.limit) || 12));
    const where = { status };
    if (q.charityId) where.charityId = q.charityId;
    const sdg = parseInt(q.sdg);
    if (sdg >= 1 && sdg <= 17) where.sdgIds = { has: sdg };

    const [rows, total] = await Promise.all([
      prisma.project.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        select: {
          id: true, slug: true, title: true, story: true, headerImage: true, targetAmount: true, raisedAmount: true,
          status: true, sdgIds: true, startDate: true, endDate: true,
          charity: { select: CHARITY_CARD },
          _count: { select: { products: { where: { status: 'ACTIVE' } } } },
        },
      }),
      prisma.project.count({ where }),
    ]);
    // Cards only need a teaser, not the whole story.
    const items = rows.map(({ story, ...p }) => ({ ...p, summary: story.length > 180 ? story.slice(0, 180).trimEnd() + '…' : story, artworkCount: p._count.products }));
    return c.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

projects.get('/:slug', async (c) => {
  const prisma = c.get('prisma');
  try {
    const project = await prisma.project.findUnique({
      where: { slug: c.req.param('slug') },
      select: {
        id: true, slug: true, title: true, story: true, headerImage: true, campaignVideo: true,
        targetAmount: true, raisedAmount: true, status: true, sdgIds: true, startDate: true, endDate: true, charityId: true,
        charity: { select: { ...CHARITY_CARD, mission: true, sdgIds: true, websiteUrl: true } },
        products: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' }, select: PRODUCT_CARD },
      },
    });
    if (!project || !PUBLIC_STATUSES.includes(project.status)) return c.json({ error: 'Not found' }, 404);
    const { charityId, ...rest } = project;
    return c.json({ ...rest, charityRaised: await getCharityRaised(prisma, charityId) });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

export default projects;
