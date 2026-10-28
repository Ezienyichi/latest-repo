// Partners & collaborators shown in the homepage / About-page carousel.
//
// Stored where the carousel already reads from — PageContent('partners').body.logos,
// a JSON list — so there is no schema change and admin edits show on the public
// site immediately. The list ORDER is the display order.
//
//   item: { id, name, logo, website, description, type, active }
//     logo     image URL (null → the name is shown as a text mark)
//     website  optional link the logo opens
//     type     'PARTNER' (organisations we work with) | 'COLLABORATOR' (creatives/teams we build with)
//     active   false → kept for the admin, hidden from the public
//
// Legacy rows were { name, url } where `url` was the logo image; they are
// normalised on read.

export const PARTNER_TYPES = ['PARTNER', 'COLLABORATOR'];
export const MAX_PARTNERS = 60;
const SLUG = 'partners';
const HTTP_URL = /^https?:\/\/\S+$/i;

export function normalizePartner(raw) {
  const r = raw || {};
  return {
    id: typeof r.id === 'string' && r.id ? r.id : crypto.randomUUID(),
    name: typeof r.name === 'string' ? r.name : '',
    logo: (typeof r.logo === 'string' && r.logo) || (typeof r.url === 'string' && r.url) || null,
    website: typeof r.website === 'string' && r.website ? r.website : null,
    description: typeof r.description === 'string' && r.description ? r.description : null,
    type: PARTNER_TYPES.includes(r.type) ? r.type : 'PARTNER',
    active: r.active === false ? false : true,
  };
}

// Validates the editable fields. `partial` → only the keys present are checked.
export function parsePartner(body, { partial }) {
  const out = {};
  const has = (k) => body[k] !== undefined;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid request' };

  if (has('name') || !partial) {
    if (typeof body.name !== 'string' || !body.name.trim()) return { error: 'Name is required' };
    if (body.name.trim().length > 100) return { error: 'Name must be 100 characters or fewer' };
    out.name = body.name.trim();
  }
  for (const [k, label] of [['logo', 'Logo'], ['website', 'Website']]) {
    if (has(k)) {
      const v = body[k] === null || body[k] === '' ? null : body[k];
      if (v !== null && (typeof v !== 'string' || v.length > 500 || !HTTP_URL.test(v))) return { error: `${label} must be a full http(s) link, or empty` };
      out[k] = v;
    }
  }
  if (has('description')) {
    const v = body.description === null ? '' : body.description;
    if (typeof v !== 'string' || v.trim().length > 200) return { error: 'Description must be 200 characters or fewer' };
    out.description = v.trim() || null;
  }
  if (has('type')) {
    if (!PARTNER_TYPES.includes(body.type)) return { error: `Type must be ${PARTNER_TYPES.join(' or ')}` };
    out.type = body.type;
  }
  if (has('active')) {
    if (typeof body.active !== 'boolean') return { error: 'active must be true or false' };
    out.active = body.active;
  }
  return { value: out };
}

// Read-modify-write on the single PageContent row with an optimistic check on
// updatedAt, retried if another admin saved in between — so two people editing
// at once can't silently overwrite each other.
export async function mutatePartners(prisma, adminId, fn) {
  for (let attempt = 0; attempt < 4; attempt++) {
    let row = await prisma.pageContent.findUnique({ where: { slug: SLUG } });
    if (!row) row = await prisma.pageContent.create({ data: { slug: SLUG, title: 'Our Partners', body: { logos: [] } } });
    const rawList = Array.isArray(row.body?.logos) ? row.body.logos : [];
    const items = rawList.map(normalizePartner);
    const out = fn(items);
    if (out.error) return out;
    // Persist when the fn changed something, OR when normalisation filled in ids / the new shape
    // (so ids are stable from the first time the admin sees the list).
    const changed = out.items ? JSON.stringify(out.items) !== JSON.stringify(rawList) : JSON.stringify(items) !== JSON.stringify(rawList);
    const next = out.items || items;
    if (!changed) return { ...out, items: next };
    const upd = await prisma.pageContent.updateMany({ where: { id: row.id, updatedAt: row.updatedAt }, data: { body: { ...(row.body || {}), logos: next }, updatedBy: adminId } });
    if (upd.count === 1) return { ...out, items: next, before: items };
  }
  return { error: 'Someone else changed the partners at the same moment — please try again', status: 409 };
}

// What the PUBLIC may see: active partners only, in order, with just the display fields.
export function publicPartners(rawLogos) {
  return (Array.isArray(rawLogos) ? rawLogos : []).map(normalizePartner).filter(p => p.active && p.name.trim())
    .map(({ name, logo, website, description, type }) => ({ name, logo, url: logo, website, description, type }));   // `url` kept for the older carousel contract
}
