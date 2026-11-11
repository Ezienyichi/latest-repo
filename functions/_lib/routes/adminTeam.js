import { Hono } from 'hono';
import { staffOk } from '../auth.js';
import { writeAuditLog } from '../audit.js';

// Team members shown on the About page (public read: GET /api/content/team). ADMIN + STAFF may manage them.
// Mounted at /api/admin/team.
const team = new Hono();
const HTTP = /^https?:\/\/\S+$/i;

function parse(b, partial) {
  const out = {};
  if (!partial || b.name !== undefined) { if (typeof b.name !== 'string' || !b.name.trim() || b.name.trim().length > 100) return { error: 'Name is required (up to 100 characters)' }; out.name = b.name.trim(); }
  if (!partial || b.role !== undefined) { if (typeof b.role !== 'string' || !b.role.trim() || b.role.trim().length > 100) return { error: 'Role / title is required (up to 100 characters)' }; out.role = b.role.trim(); }
  if (b.photoPath !== undefined) {
    if (b.photoPath === null || b.photoPath === '') out.photoPath = null;
    else if (typeof b.photoPath !== 'string' || b.photoPath.length > 600 || !HTTP.test(b.photoPath)) return { error: 'Photo must be an uploaded image URL' };
    else out.photoPath = b.photoPath;
  }
  if (b.sortOrder !== undefined) { const n = Number(b.sortOrder); if (!Number.isInteger(n) || n < 0 || n > 10000) return { error: 'Order must be a whole number' }; out.sortOrder = n; }
  if (b.active !== undefined) { if (typeof b.active !== 'boolean') return { error: 'Active must be true or false' }; out.active = b.active; }
  return { data: out };
}
const audit = (c, action, id, before, after) => writeAuditLog(c.get('prisma'), { adminId: c.get('userId'), action, targetType: 'TeamMember', targetId: id, before, after });

team.get('/', staffOk, async (c) => {
  try { return c.json({ items: await c.get('prisma').teamMember.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }) }); }
  catch { return c.json({ error: 'Failed' }, 500); }
});

team.post('/', staffOk, async (c) => {
  try {
    const p = parse(await c.req.json().catch(() => ({})), false); if (p.error) return c.json({ error: p.error }, 400);
    const prisma = c.get('prisma');
    if (p.data.sortOrder === undefined) p.data.sortOrder = ((await prisma.teamMember.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1;
    const m = await prisma.teamMember.create({ data: p.data });
    await audit(c, 'team.create', m.id, null, p.data);
    return c.json(m, 201);
  } catch (e) { console.error(e.message); return c.json({ error: 'Create failed' }, 500); }
});

team.patch('/:id', staffOk, async (c) => {
  try {
    const prisma = c.get('prisma'), id = c.req.param('id');
    const before = await prisma.teamMember.findUnique({ where: { id } }); if (!before) return c.json({ error: 'Not found' }, 404);
    const p = parse(await c.req.json().catch(() => ({})), true); if (p.error) return c.json({ error: p.error }, 400);
    const m = await prisma.teamMember.update({ where: { id }, data: p.data });
    await audit(c, 'team.update', id, { name: before.name, role: before.role, active: before.active }, p.data);
    return c.json(m);
  } catch (e) { console.error(e.message); return c.json({ error: 'Update failed' }, 500); }
});

team.delete('/:id', staffOk, async (c) => {
  try {
    const prisma = c.get('prisma'), id = c.req.param('id');
    const before = await prisma.teamMember.findUnique({ where: { id } }); if (!before) return c.json({ error: 'Not found' }, 404);
    await prisma.teamMember.delete({ where: { id } });
    await audit(c, 'team.delete', id, { name: before.name, role: before.role }, null);
    return c.json({ ok: true });
  } catch (e) { console.error(e.message); return c.json({ error: 'Delete failed' }, 500); }
});

export default team;
