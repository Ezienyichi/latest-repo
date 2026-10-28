import { Hono } from 'hono';
import { writeAuditLog } from '../audit.js';
import { mutatePartners, parsePartner, MAX_PARTNERS } from '../partners.js';

// Mounted under /api/admin — authenticate + requireRole('ADMIN') already guard everything here.
const adminPartners = new Hono();

const audit = (c, action, targetId, before, after) =>
  writeAuditLog(c.get('prisma'), { adminId: c.get('userId'), action, targetType: 'PageContent', targetId: `partners:${targetId}`, before, after });
const fail = (c, out) => c.json({ error: out.error }, out.status || 400);

// Every partner, including inactive ones, in display order.
adminPartners.get('/', async (c) => {
  try {
    const out = await mutatePartners(c.get('prisma'), c.get('userId'), () => ({}));   // read (and persist ids the first time)
    if (out.error) return fail(c, out);
    return c.json({ items: out.items, total: out.items.length, max: MAX_PARTNERS });
  } catch (e) { console.error(e); return c.json({ error: 'Failed' }, 500); }
});

adminPartners.post('/', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const parsed = parsePartner(body, { partial: false });
    if (parsed.error) return c.json({ error: parsed.error }, 400);
    let created;
    const out = await mutatePartners(c.get('prisma'), c.get('userId'), (items) => {
      if (items.length >= MAX_PARTNERS) return { error: `At most ${MAX_PARTNERS} partners` };
      created = { id: crypto.randomUUID(), name: '', logo: null, website: null, description: null, type: 'PARTNER', active: true, ...parsed.value };
      return { items: [...items, created] };
    });
    if (out.error) return fail(c, out);
    await audit(c, 'partner.create', created.id, null, created);
    return c.json({ item: created, items: out.items }, 201);
  } catch (e) { console.error(e); return c.json({ error: 'Create failed' }, 500); }
});

// Reorder: the new order must contain exactly the current partners.
adminPartners.post('/reorder', async (c) => {
  try {
    const { ids } = await c.req.json().catch(() => ({}));
    if (!Array.isArray(ids) || !ids.every(i => typeof i === 'string')) return c.json({ error: 'ids must be a list of partner ids' }, 400);
    const out = await mutatePartners(c.get('prisma'), c.get('userId'), (items) => {
      const byId = new Map(items.map(i => [i.id, i]));
      if (ids.length !== items.length || new Set(ids).size !== ids.length || !ids.every(i => byId.has(i))) return { error: 'The new order must list every partner exactly once' };
      return { items: ids.map(i => byId.get(i)) };
    });
    if (out.error) return fail(c, out);
    await audit(c, 'partner.reorder', 'all', { order: (out.before || []).map(i => i.id) }, { order: out.items.map(i => i.id) });
    return c.json({ items: out.items });
  } catch (e) { console.error(e); return c.json({ error: 'Reorder failed' }, 500); }
});

adminPartners.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = parsePartner(body, { partial: true });
    if (parsed.error) return c.json({ error: parsed.error }, 400);
    if (!Object.keys(parsed.value).length) return c.json({ error: 'Nothing to update' }, 400);
    let before, after;
    const out = await mutatePartners(c.get('prisma'), c.get('userId'), (items) => {
      const i = items.findIndex(p => p.id === id);
      if (i < 0) return { error: 'Partner not found', status: 404 };
      before = items[i]; after = { ...items[i], ...parsed.value };
      return { items: items.map((p, j) => (j === i ? after : p)) };
    });
    if (out.error) return fail(c, out);
    await audit(c, 'partner.update', id, before, after);
    return c.json({ item: after, items: out.items });
  } catch (e) { console.error(e); return c.json({ error: 'Update failed' }, 500); }
});

adminPartners.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    let removed;
    const out = await mutatePartners(c.get('prisma'), c.get('userId'), (items) => {
      removed = items.find(p => p.id === id);
      if (!removed) return { error: 'Partner not found', status: 404 };
      return { items: items.filter(p => p.id !== id) };
    });
    if (out.error) return fail(c, out);
    await audit(c, 'partner.delete', id, removed, null);
    return c.json({ ok: true, items: out.items });
  } catch (e) { console.error(e); return c.json({ error: 'Delete failed' }, 500); }
});

export default adminPartners;
