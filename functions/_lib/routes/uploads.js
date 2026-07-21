import { Hono } from 'hono';
import { authenticate } from '../auth.js';
import { getStorageClient, BUCKETS, WRITABLE_BUCKETS_BY_ROLE } from '../storage.js';
import { checkRateLimit } from '../rateLimit.js';

const uploads = new Hono();
uploads.use('*', authenticate);

const SIGN_LIMIT = 20;
const SIGN_WINDOW_SECONDS = 60;

function sanitizeFilename(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'file';
}

// Issues a signed upload URL scoped to the caller's own path
// ({bucket}/{userId}/{uuid}-{filename}) so nobody can write into another
// user's namespace. Validates bucket permission, mime type, and declared
// size before signing — Supabase's own bucket-level fileSizeLimit /
// allowedMimeTypes then re-enforces size and type at the actual upload,
// so a client that lies about either in this request still gets rejected.
uploads.post('/sign', async (c) => {
  const userId = c.get('userId');
  const userRole = c.get('userRole');
  try {
    const ok = await checkRateLimit(c.env.RATE_LIMIT_KV, `uploads:sign:${userId}`, SIGN_LIMIT, SIGN_WINDOW_SECONDS);
    if (!ok) return c.json({ error: 'Too many upload requests — please wait a moment and try again' }, 429);

    const { bucket, filename, contentType, fileSize } = await c.req.json();
    const policy = BUCKETS[bucket];
    if (!policy) return c.json({ error: 'Unknown bucket' }, 400);
    if (!WRITABLE_BUCKETS_BY_ROLE[userRole]?.includes(bucket)) {
      return c.json({ error: 'Not permitted to upload to this bucket' }, 403);
    }
    if (!filename || !contentType) return c.json({ error: 'filename and contentType are required' }, 400);
    if (!policy.allowedMime.includes(contentType)) {
      return c.json({ error: `File type "${contentType}" is not allowed for ${bucket}` }, 400);
    }
    if (typeof fileSize !== 'number' || fileSize <= 0) {
      return c.json({ error: 'fileSize is required' }, 400);
    }
    if (fileSize > policy.maxBytes) {
      return c.json({ error: `File exceeds the ${Math.round(policy.maxBytes / (1024 * 1024))}MB limit for ${bucket}` }, 400);
    }

    const path = `${userId}/${crypto.randomUUID()}-${sanitizeFilename(filename)}`;
    const supabase = getStorageClient(c.env);
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error) { console.error('createSignedUploadUrl failed:', error.message); return c.json({ error: 'Failed to create upload URL' }, 500); }

    // Computed here (not by the browser) since only the Worker has
    // SUPABASE_URL — keeps the client free of any Supabase env vars at all.
    const publicUrl = policy.public ? `${c.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}` : null;

    return c.json({ bucket, path, signedUrl: data.signedUrl, publicUrl });
  } catch (e) { console.error(e); return c.json({ error: 'Failed' }, 500); }
});

// Mints a short-lived signed download URL for a private-bucket object,
// after checking the requester is actually entitled to it. `context`
// selects which entitlement check applies — nothing is served on bucket
// name/path alone.
uploads.get('/download', async (c) => {
  const prisma = c.get('prisma');
  const userId = c.get('userId');
  const userRole = c.get('userRole');
  try {
    const { bucket, path, context, refId } = c.req.query();
    const policy = BUCKETS[bucket];
    if (!policy) return c.json({ error: 'Unknown bucket' }, 400);
    if (policy.public) return c.json({ error: 'This bucket is public — use the public URL directly' }, 400);
    if (!path) return c.json({ error: 'path is required' }, 400);

    let entitled = userRole === 'ADMIN';

    if (!entitled && bucket === 'artwork' && context === 'product-file') {
      const product = await prisma.product.findUnique({ where: { id: refId }, select: { fileUrl: true, artist: { select: { userId: true } } } });
      if (!product) return c.json({ error: 'Not found' }, 404);
      if (product.artist.userId === userId) entitled = true;
      if (!entitled) {
        const owned = await prisma.orderItem.findFirst({ where: { productId: refId, order: { buyerId: userId } } });
        entitled = !!owned;
      }
    } else if (!entitled && bucket === 'charity-docs' && context === 'verification-doc') {
      const doc = await prisma.charityDocument.findUnique({ where: { id: refId }, select: { charity: { select: { userId: true } } } });
      if (!doc) return c.json({ error: 'Not found' }, 404);
      entitled = doc.charity.userId === userId;
    } else if (!entitled && bucket === 'charity-docs' && context === 'charity-resource') {
      const resource = await prisma.charityResource.findUnique({ where: { id: refId }, select: { visibility: true, charity: { select: { id: true, userId: true } } } });
      if (!resource) return c.json({ error: 'Not found' }, 404);
      if (resource.charity.userId === userId) entitled = true;
      else if (resource.visibility === 'PUBLIC') entitled = true;
      else if (resource.visibility === 'FUNDERS_ONLY') {
        const funder = await prisma.funderRelationship.findUnique({ where: { userId_charityId: { userId, charityId: resource.charity.id } } });
        entitled = !!funder;
      }
    }

    if (!entitled) return c.json({ error: 'Not entitled to this file' }, 403);

    const supabase = getStorageClient(c.env);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (error) { console.error('createSignedUrl failed:', error.message); return c.json({ error: 'Failed to create download URL' }, 500); }

    return c.json({ signedUrl: data.signedUrl });
  } catch (e) { console.error(e); return c.json({ error: 'Failed' }, 500); }
});

export default uploads;
