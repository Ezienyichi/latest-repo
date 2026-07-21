// Supabase Storage access for the Worker. The service role key never
// leaves this process — the browser only ever sees a short-lived signed
// URL (upload or download), never the key itself.
import { createClient } from '@supabase/supabase-js';

export function getStorageClient(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// Per-bucket write policy, enforced server-side at sign time. Supabase is
// also configured with matching fileSizeLimit/allowedMimeTypes on each
// bucket (see scripts/setup-storage-buckets.js) so a forged/modified
// client can't bypass this by lying about size or type in the sign
// request — Supabase itself rejects the actual upload if it doesn't match.
export const BUCKETS = {
  artwork: {
    public: false,
    // 50MB is this Supabase project's plan-level cap (verified empirically —
    // bucket creation rejects any fileSizeLimit above it). Raise this only
    // after raising the project's own limit (Settings → Storage), otherwise
    // bucket creation itself fails.
    maxBytes: 50 * 1024 * 1024,
    allowedMime: [
      'application/pdf', 'application/epub+zip', 'application/zip',
      'audio/mpeg', 'audio/wav', 'audio/flac',
      'video/mp4', 'video/quicktime',
      'image/vnd.adobe.photoshop', 'application/postscript',
    ],
  },
  previews: {
    public: true,
    maxBytes: 15 * 1024 * 1024,
    allowedMime: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  avatars: {
    public: true,
    maxBytes: 5 * 1024 * 1024,
    allowedMime: ['image/jpeg', 'image/png', 'image/webp'],
  },
  'charity-docs': {
    public: false,
    maxBytes: 20 * 1024 * 1024,
    allowedMime: ['application/pdf', 'image/jpeg', 'image/png'],
  },
};

// Which buckets each role may request a write to. Read/download
// entitlement (for private buckets) is checked separately per-object in
// the download route, not here.
export const WRITABLE_BUCKETS_BY_ROLE = {
  ARTIST: ['artwork', 'previews', 'avatars'],
  CHARITY: ['avatars', 'charity-docs'],
  BUYER: ['avatars'],
  ADMIN: ['artwork', 'previews', 'avatars', 'charity-docs'],
};
