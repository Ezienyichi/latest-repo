import { Hono } from 'hono';
import { writeAuditLog } from '../audit.js';
import {
  SUBMISSION_TYPES, TYPE_ENUM, TYPE_FROM_ENUM, getFormToken, rotateFormToken, createCharityRecord, placeholderEmail,
} from '../submissions.js';

// Mounted under /api/admin, so authenticate + requireRole('ADMIN') from
// admin.js already guard every route here.
const adminSubmissions = new Hono();

const toJson = (x) => JSON.parse(JSON.stringify(x));
const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const TARGET_TYPE = { charity: 'CharityProfile', campaign: 'Project', artwork: 'Product' };

const CHARITY_SEL = { id: true, name: true, logo: true, mission: true, registrationNo: true, websiteUrl: true, sdgIds: true, target: true, images: true, verified: true, submissionStatus: true, createdAt: true };
const CAMPAIGN_SEL = { id: true, slug: true, title: true, story: true, headerImage: true, campaignVideo: true, images: true, sdgIds: true, targetAmount: true, startDate: true, endDate: true, charityId: true, status: true, submissionStatus: true, createdAt: true };
const ARTWORK_SEL = { id: true, slug: true, title: true, description: true, category: true, editionType: true, basePrice: true, medium: true, year: true, dimensions: true, images: true, sdgIds: true, artistId: true, status: true, submissionStatus: true, createdAt: true };

const model = (prisma, type) => (type === 'charity' ? prisma.charityProfile : type === 'campaign' ? prisma.project : prisma.product);
const select = (type) => (type === 'charity' ? CHARITY_SEL : type === 'campaign' ? CAMPAIGN_SEL : ARTWORK_SEL);
const titleOf = (type, e) => (type === 'charity' ? e.name : e.title);

adminSubmissions.get('/count', async (c) => {
  const prisma = c.get('prisma');
  try {
    const [charity, campaign, artwork] = await Promise.all(SUBMISSION_TYPES.map(t => model(prisma, t).count({ where: { submissionStatus: 'PENDING' } })));
    return c.json({ charity, campaign, artwork, total: charity + campaign + artwork });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

// The pending queue (or APPROVED / REJECTED via ?status=), newest first,
// across the three types.
adminSubmissions.get('/', async (c) => {
  const prisma = c.get('prisma');
  try {
    const q = c.req.query();
    const status = STATUSES.includes(q.status) ? q.status : 'PENDING';
    const types = SUBMISSION_TYPES.includes(q.type) ? [q.type] : SUBMISSION_TYPES;
    const groups = await Promise.all(types.map(async (type) => {
      const entities = await model(prisma, type).findMany({ where: { submissionStatus: status }, select: select(type), orderBy: { createdAt: 'desc' }, take: 200 });
      const subs = await prisma.submission.findMany({ where: { type: TYPE_ENUM[type], entityId: { in: entities.map(e => e.id) } } });
      const byEntity = Object.fromEntries(subs.map(s => [s.entityId, s]));
      return entities
        // An approved/rejected-but-never-submitted record (admin-created) has no Submission row: not part of this queue.
        .filter(e => byEntity[e.id])
        .map(e => ({
          type, id: e.id, status: e.submissionStatus, title: titleOf(type, e), submittedAt: byEntity[e.id].createdAt,
          contact: byEntity[e.id].contact, extra: byEntity[e.id].extra, reviewNote: byEntity[e.id].reviewNote, entity: e,
        }));
    }));
    const items = groups.flat().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return c.json({ items, total: items.length, status });
  } catch (e) { console.error(e); return c.json({ error: 'Failed' }, 500); }
});

// The three private form links. Tokens are created on first request and are
// permanent until rotated.
adminSubmissions.get('/links', async (c) => {
  const prisma = c.get('prisma');
  try {
    const links = [];
    for (const type of SUBMISSION_TYPES) {
      const token = await getFormToken(prisma, type, { create: true });
      links.push({ type, token, path: `/submit/${type}/${token}` });
    }
    return c.json({ links });
  } catch (e) { return c.json({ error: 'Failed' }, 500); }
});

adminSubmissions.post('/links/:type/rotate', async (c) => {
  const prisma = c.get('prisma');
  try {
    const type = c.req.param('type');
    if (!SUBMISSION_TYPES.includes(type)) return c.json({ error: 'Unknown form' }, 404);
    const token = await rotateFormToken(prisma, type);
    // The token itself is a secret, so it is deliberately not written to the audit log.
    await writeAuditLog(prisma, { adminId: c.get('userId'), action: 'submission_link.rotate', targetType: 'SiteSetting', targetId: `submit_token_${type}` });
    return c.json({ type, token, path: `/submit/${type}/${token}` });
  } catch (e) { return c.json({ error: 'Rotate failed' }, 500); }
});

async function loadForReview(prisma, type, id) {
  if (!SUBMISSION_TYPES.includes(type)) return { status: 404, error: 'Unknown submission type' };
  const entity = await model(prisma, type).findUnique({ where: { id }, select: select(type) });
  const submission = entity && await prisma.submission.findUnique({ where: { type_entityId: { type: TYPE_ENUM[type], entityId: id } } });
  if (!entity || !submission) return { status: 404, error: 'Submission not found' };
  return { entity, submission };
}

const nameTaken = (prisma, name, exceptId) => prisma.charityProfile.findFirst({
  where: { name: { equals: name, mode: 'insensitive' }, submissionStatus: 'APPROVED', ...(exceptId ? { NOT: { id: exceptId } } : {}) }, select: { id: true },
});

adminSubmissions.post('/:type/:id/approve', async (c) => {
  const prisma = c.get('prisma');
  try {
    const type = c.req.param('type'), id = c.req.param('id');
    const loaded = await loadForReview(prisma, type, id); if (loaded.error) return c.json({ error: loaded.error }, loaded.status);
    const { entity, submission } = loaded;
    if (entity.submissionStatus === 'APPROVED') return c.json({ error: 'Already approved' }, 409);
    const body = await c.req.json().catch(() => ({}));
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) || null : null;
    const before = toJson(entity);
    let created = null; // id of an account/record minted by this approval, for the audit trail

    const result = await prisma.$transaction(async (tx) => {
      let updated;
      if (type === 'charity') {
        if (await nameTaken(tx, entity.name, id)) throw Object.assign(new Error('A live charity with that name already exists — rename this one or reject it'), { http: 409 });
        updated = await tx.charityProfile.update({ where: { id }, data: { submissionStatus: 'APPROVED', ...(body.verified === true && { verified: true }) }, select: CHARITY_SEL });
      } else if (type === 'campaign') {
        const hasLink = typeof body.charityId === 'string' && body.charityId, wantsNew = body.createCharity === true;
        if (!!hasLink === wantsNew) throw Object.assign(new Error('Choose exactly one: link an existing charity (charityId) or create one from the submission (createCharity)'), { http: 400 });
        let charityId;
        if (hasLink) {
          const ch = await tx.charityProfile.findUnique({ where: { id: body.charityId }, select: { id: true, submissionStatus: true } });
          if (!ch || ch.submissionStatus !== 'APPROVED') throw Object.assign(new Error('Choose an existing, approved charity'), { http: 400 });
          charityId = ch.id;
        } else {
          const info = submission.extra?.charity;
          if (!info?.name) throw Object.assign(new Error('This submission has no charity details to create a charity from'), { http: 400 });
          if (await nameTaken(tx, info.name)) throw Object.assign(new Error(`A charity named "${info.name}" already exists — link that one instead`), { http: 409 });
          const ch = await createCharityRecord(tx, {
            name: info.name, mission: info.mission ?? null, registrationNo: info.registrationNo ?? null, websiteUrl: info.websiteUrl ?? null,
            logo: info.logo ?? null, sdgIds: info.sdgIds ?? [],
          }, { submissionStatus: 'APPROVED' });
          charityId = ch.id; created = ch.id;
        }
        updated = await tx.project.update({ where: { id }, data: { charityId, status: 'ACTIVE', submissionStatus: 'APPROVED' }, select: CAMPAIGN_SEL });
      } else {
        const hasLink = typeof body.artistId === 'string' && body.artistId, wantsNew = body.createArtist === true;
        if (!!hasLink === wantsNew) throw Object.assign(new Error('Choose exactly one: assign an existing artist (artistId) or create one from the submission (createArtist)'), { http: 400 });
        let artistId;
        if (hasLink) {
          const a = await tx.artistProfile.findUnique({ where: { id: body.artistId }, select: { id: true } });
          if (!a) throw Object.assign(new Error('Choose an existing artist'), { http: 400 });
          artistId = a.id;
        } else {
          const info = submission.extra?.artist;
          if (!info?.displayName) throw Object.assign(new Error('This submission has no artist details to create an artist from'), { http: 400 });
          const user = await tx.user.create({ data: { email: placeholderEmail('artist'), role: 'ARTIST', firstName: info.displayName } });
          const profile = await tx.artistProfile.create({ data: {
            userId: user.id, displayName: info.displayName, biography: info.biography ?? null, location: info.location ?? null,
            socialLinks: info.websiteUrl ? { website: info.websiteUrl } : {}, joinedYear: new Date().getFullYear(),
          } });
          artistId = profile.id; created = profile.id;
        }
        updated = await tx.product.update({ where: { id }, data: { artistId, status: 'ACTIVE', submissionStatus: 'APPROVED' }, select: ARTWORK_SEL });
      }
      await tx.submission.update({ where: { id: submission.id }, data: { reviewedAt: new Date(), reviewedById: c.get('userId'), reviewNote: note } });
      return updated;
    });

    await writeAuditLog(prisma, {
      adminId: c.get('userId'), action: 'submission.approve', targetType: TARGET_TYPE[type], targetId: id,
      before, after: { ...toJson(result), ...(created && { createdRecordId: created }), ...(note && { note }) },
    });
    return c.json({ ok: true, type, id, entity: result, createdRecordId: created });
  } catch (e) {
    if (e.http) return c.json({ error: e.message }, e.http);
    console.error(e); return c.json({ error: 'Approve failed' }, 500);
  }
});

adminSubmissions.post('/:type/:id/reject', async (c) => {
  const prisma = c.get('prisma');
  try {
    const type = c.req.param('type'), id = c.req.param('id');
    const loaded = await loadForReview(prisma, type, id); if (loaded.error) return c.json({ error: loaded.error }, loaded.status);
    const { entity, submission } = loaded;
    if (entity.submissionStatus !== 'PENDING') return c.json({ error: `Only pending submissions can be rejected (this one is ${entity.submissionStatus.toLowerCase()})` }, 409);
    const body = await c.req.json().catch(() => ({}));
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) || null : null;
    // Stays in the database, hidden: submissionStatus REJECTED is excluded by every public query.
    await prisma.$transaction([
      model(prisma, type).update({ where: { id }, data: { submissionStatus: 'REJECTED' } }),
      prisma.submission.update({ where: { id: submission.id }, data: { reviewedAt: new Date(), reviewedById: c.get('userId'), reviewNote: note } }),
    ]);
    await writeAuditLog(prisma, {
      adminId: c.get('userId'), action: 'submission.reject', targetType: TARGET_TYPE[type], targetId: id,
      before: toJson(entity), after: { submissionStatus: 'REJECTED', ...(note && { note }) },
    });
    return c.json({ ok: true, type, id });
  } catch (e) { console.error(e); return c.json({ error: 'Reject failed' }, 500); }
});

export default adminSubmissions;
