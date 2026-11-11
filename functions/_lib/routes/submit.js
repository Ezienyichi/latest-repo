import { Hono } from 'hono';
import { checkRateLimit } from '../rateLimit.js';
import { legalDoc, latestVersion } from '../legal.js';
import { getStorageClient, BUCKETS } from '../storage.js';
import {
  SUBMISSION_TYPES, TYPE_ENUM, SUBMISSION_BUCKET, SUBMISSION_PREFIX, MAX_BODY_BYTES,
  getFormToken, tokensMatch, parseSubmission, uniqueSlug, createCharityRecord, getHouseArtist, AGREEMENT_FOR, parseSignature,
} from '../submissions.js';

// PUBLIC (no login). Each of the three invite forms posts here. Everything
// created is PENDING: invisible on every public page until an admin approves
// it (see routes/adminSubmissions.js).
//
// The form links are private: each form has its own secret token (sent as
// the X-Submit-Token header) that the admin copies from the Submissions page.
// A missing/wrong token gets the same 404 as an unknown route.
const submit = new Hono();

const SUBMIT_LIMIT = 10;            // submissions per IP per type
const SUBMIT_WINDOW_SECONDS = 3600;
const UPLOAD_LIMIT = 40;            // signed-URL requests per IP
const UPLOAD_WINDOW_SECONDS = 600;
const BAD_TOKEN_LIMIT = 30;         // wrong-token guesses per IP
const BAD_TOKEN_WINDOW_SECONDS = 600;
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

const clientIp = (c) => c.req.header('cf-connecting-ip') || 'unknown';
const NOT_FOUND = (c) => c.json({ error: 'Not found' }, 404);

// Resolves to null when the caller holds the right token for `type`, else a
// ready-made error Response.
async function gate(c, type) {
  if (!SUBMISSION_TYPES.includes(type)) return NOT_FOUND(c);
  const prisma = c.get('prisma');
  const expected = await getFormToken(prisma, type);
  if (tokensMatch(expected, c.req.header('x-submit-token'))) return null;
  const ok = await checkRateLimit(c.env.RATE_LIMIT_KV, `submit:bad:${clientIp(c)}`, BAD_TOKEN_LIMIT, BAD_TOKEN_WINDOW_SECONDS);
  return ok ? NOT_FOUND(c) : c.json({ error: 'Too many attempts — please try again later' }, 429);
}

async function readJson(c) {
  const declared = parseInt(c.req.header('content-length') || '0', 10);
  if (declared > MAX_BODY_BYTES) return { error: 'Request too large', status: 413 };
  const raw = await c.req.text();
  if (raw.length > MAX_BODY_BYTES) return { error: 'Request too large', status: 413 };
  try { return { body: JSON.parse(raw) }; } catch { return { error: 'Invalid request', status: 400 }; }
}

// Lets a form page confirm its link is valid before rendering.
submit.get('/:type/check', async (c) => {
  const denied = await gate(c, c.req.param('type'));
  return denied || c.json({ ok: true });
});

// Anonymous signed-upload URL, hard-scoped: the bucket and the key prefix are
// fixed server-side (previews / submissions/), images only, 10MB. The client
// can't pick either, so a signed URL can only ever write one new file under
// submissions/.
submit.post('/upload/sign', async (c) => {
  try {
    const { body, error, status } = await readJson(c); if (error) return c.json({ error }, status);
    const denied = await gate(c, body?.type); if (denied) return denied;
    const ok = await checkRateLimit(c.env.RATE_LIMIT_KV, `submit:upload:${clientIp(c)}`, UPLOAD_LIMIT, UPLOAD_WINDOW_SECONDS);
    if (!ok) return c.json({ error: 'Too many uploads — please wait a few minutes and try again' }, 429);

    const { filename, contentType, fileSize } = body;
    const policy = BUCKETS[SUBMISSION_BUCKET];
    if (typeof filename !== 'string' || !filename.trim() || filename.length > 200) return c.json({ error: 'filename is required' }, 400);
    if (!policy.allowedMime.includes(contentType)) return c.json({ error: `File type "${contentType}" is not allowed — use JPG, PNG, WebP or GIF` }, 400);
    if (typeof fileSize !== 'number' || !isFinite(fileSize) || fileSize <= 0) return c.json({ error: 'fileSize is required' }, 400);
    const max = Math.min(policy.maxBytes, UPLOAD_MAX_BYTES);
    if (fileSize > max) return c.json({ error: `Image exceeds the ${Math.round(max / (1024 * 1024))}MB limit` }, 400);

    // No path separators, and no runs of dots (so a name can never read as "..").
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.').slice(-80) || 'file';
    const path = `${SUBMISSION_PREFIX}${crypto.randomUUID()}-${safe}`;
    const { data, error: signErr } = await getStorageClient(c.env).storage.from(SUBMISSION_BUCKET).createSignedUploadUrl(path);
    if (signErr) { console.error('submission upload sign failed:', signErr.message); return c.json({ error: 'Could not start the upload' }, 500); }
    return c.json({
      path, signedUrl: data.signedUrl,
      publicUrl: `${c.env.SUPABASE_URL}/storage/v1/object/public/${SUBMISSION_BUCKET}/${path}`,
    });
  } catch (e) { console.error(e); return c.json({ error: 'Failed' }, 500); }
});

// One handler per form. Validation is strict (see submissions.js); a bad
// field returns a 400 naming it.
for (const type of SUBMISSION_TYPES) {
  submit.post(`/${type}`, async (c) => {
    const prisma = c.get('prisma');
    try {
      const denied = await gate(c, type); if (denied) return denied;
      const ok = await checkRateLimit(c.env.RATE_LIMIT_KV, `submit:${type}:${clientIp(c)}`, SUBMIT_LIMIT, SUBMIT_WINDOW_SECONDS);
      if (!ok) return c.json({ error: 'Too many submissions from this connection — please try again later' }, 429);

      const { body, error, status } = await readJson(c); if (error) return c.json({ error }, status);
      const parsed = parseSubmission(type, body, c.env);
      if (parsed.error) return c.json({ error: parsed.error }, 400);
      const { contact, entity, extra } = parsed;

      // Every submission carries the submitter's acceptance of the CURRENT agreement for their form:
      // the version they were shown, their typed full name as a signature, the time and their IP.
      const slug = AGREEMENT_FOR[type]; const meta = legalDoc(slug); const cur = await latestVersion(prisma, slug);
      if (!cur) return c.json({ error: 'The agreement isn\'t available right now, so we can\'t take submissions yet — please try again later.' }, 503);
      const ag = body.agreement;
      if (!ag || typeof ag !== 'object' || ag.accepted !== true) return c.json({ error: `Please read and accept the ${meta.title} to submit.` }, 400);
      if (ag.slug !== slug) return c.json({ error: 'That is not the right agreement for this form.' }, 400);
      if (ag.version !== cur.version) return c.json({ error: `The ${meta.title} was updated to version ${cur.version} while you were filling in the form. Please read the new version and accept it again.`, currentVersion: cur.version }, 409);
      const sig = parseSignature(ag.typedName); if (sig.error) return c.json({ error: sig.error }, 400);
      const agreement = { slug, title: meta.title, version: cur.version, acceptedAt: new Date().toISOString(), typedName: sig.value, ip: clientIp(c) };

      const submission = await prisma.$transaction(async (tx) => {
        let entityId;
        if (type === 'charity') {
          const ch = await createCharityRecord(tx, entity, { submissionStatus: 'PENDING' });
          entityId = ch.id;
        } else if (type === 'campaign') {
          const p = await tx.project.create({ data: {
            title: entity.title, slug: uniqueSlug(entity.title), story: entity.story, charityId: null,
            headerImage: entity.headerImage, campaignVideo: entity.campaignVideo, images: entity.images, sdgIds: entity.sdgIds,
            targetAmount: entity.targetAmount.toFixed(2), startDate: entity.startDate, endDate: entity.endDate,
            status: 'DRAFT', submissionStatus: 'PENDING',
          } });
          entityId = p.id;
        } else {
          const house = await getHouseArtist(tx);
          if (!house) throw new Error('NO_HOUSE_ARTIST');
          const base = { artistId: house.id, title: entity.title, slug: uniqueSlug(entity.title), description: entity.description, category: entity.category, year: entity.year, images: entity.images, sdgIds: entity.sdgIds, status: 'DRAFT', submissionStatus: 'PENDING' };
          const data = entity.category === 'ARTWORK'
            ? { ...base, editionType: entity.editionType, basePrice: entity.basePrice.toFixed(2), medium: entity.medium, dimensions: entity.dimensions }
            // MUSIC / BOOK: the listen / read link, format and per-edition prices travel with the product (never public until approved + live)
            : { ...base, basePrice: Number(entity.basePrice).toFixed(2), creatorName: entity.creatorName, digitalAccessUrl: entity.digitalAccessUrl, bookFormat: entity.bookFormat, digitalPrice: entity.digitalPrice != null ? Number(entity.digitalPrice).toFixed(2) : null, physicalPrice: entity.physicalPrice != null ? Number(entity.physicalPrice).toFixed(2) : null, isbn: entity.isbn, publisher: entity.publisher, language: entity.language, pages: entity.pages };
          const pr = await tx.product.create({ data });
          entityId = pr.id;
        }
        return tx.submission.create({ data: { type: TYPE_ENUM[type], entityId, contact, extra: extra ?? undefined, agreement } });
      });
      // Only the reference leaves the server — never the stored record.
      return c.json({ ok: true, reference: submission.id }, 201);
    } catch (e) {
      console.error('submission failed:', e.message);
      return c.json({ error: 'Could not save your submission — please try again' }, 500);
    }
  });
}

export default submit;
