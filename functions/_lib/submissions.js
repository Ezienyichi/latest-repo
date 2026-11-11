// Invite-link submissions: strict payload validation, the per-form secret
// tokens, and the helpers that mint placeholder owner accounts.
//
// A submission creates a record with submissionStatus PENDING. Every public
// read path filters on submissionStatus = APPROVED, so a pending (or
// rejected) record is invisible and never counts toward a rollup until an
// admin approves it.
import { slugify } from './helpers.js';
import { checkDigitalProduct } from './digital.js';

export const SUBMISSION_TYPES = ['charity', 'campaign', 'artwork'];
export const TYPE_ENUM = { charity: 'CHARITY', campaign: 'CAMPAIGN', artwork: 'ARTWORK' };
export const TYPE_FROM_ENUM = { CHARITY: 'charity', CAMPAIGN: 'campaign', ARTWORK: 'artwork' };

// The one storage area anonymous submitters may write to. Server-fixed — the
// client never chooses a bucket or a path.
export const SUBMISSION_BUCKET = 'previews';
export const SUBMISSION_PREFIX = 'submissions/';
export const MAX_BODY_BYTES = 64 * 1024;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTTP_URL_RE = /^https?:\/\/[^\s]+$/i;

// ── secret form tokens ──────────────────────────────────────────────────
// One unguessable token per form, stored as a SiteSetting (never in
// PUBLIC_KEYS, so it is never served by /api/settings/public).
const tokenKey = (type) => `submit_token_${type}`;

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function getFormToken(prisma, type, { create = false } = {}) {
  const row = await prisma.siteSetting.findUnique({ where: { key: tokenKey(type) } });
  if (typeof row?.value === 'string' && row.value) return row.value;
  if (!create) return null;
  const value = newToken();
  await prisma.siteSetting.upsert({ where: { key: tokenKey(type) }, update: { value }, create: { key: tokenKey(type), value } });
  return value;
}

export async function rotateFormToken(prisma, type) {
  const value = newToken();
  await prisma.siteSetting.upsert({ where: { key: tokenKey(type) }, update: { value }, create: { key: tokenKey(type), value } });
  return value;
}

// Length-independent comparison so a wrong token can't be probed byte by byte.
export function tokensMatch(expected, given) {
  if (typeof expected !== 'string' || typeof given !== 'string' || !expected) return false;
  let diff = expected.length ^ given.length;
  const n = Math.max(expected.length, given.length);
  for (let i = 0; i < n; i++) diff |= (expected.charCodeAt(i) || 0) ^ (given.charCodeAt(i) || 0);
  return diff === 0;
}

// ── field validators ────────────────────────────────────────────────────
// Each returns { value } or { error }. Text is trimmed; control characters
// (other than newlines/tabs in long text) are rejected rather than stripped.
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function text(v, label, { max, min = 1, required = true, multiline = false } = {}) {
  if (v === undefined || v === null || v === '') return required ? { error: `${label} is required` } : { value: null };
  if (typeof v !== 'string') return { error: `${label} must be text` };
  const s = v.trim();
  if (!s) return required ? { error: `${label} is required` } : { value: null };
  if (s.length < min) return { error: `${label} must be at least ${min} characters` };
  if (s.length > max) return { error: `${label} must be ${max} characters or fewer` };
  if (CTRL.test(s) || (!multiline && /[\r\n\t]/.test(s))) return { error: `${label} contains invalid characters` };
  return { value: s };
}
function email(v, label = 'Email') {
  const t = text(v, label, { max: 254 }); if (t.error) return t;
  const s = t.value.toLowerCase();
  return EMAIL_RE.test(s) ? { value: s } : { error: `${label} must be a valid email address` };
}
function phone(v) {
  const t = text(v, 'Phone', { max: 30, required: false }); if (t.error || t.value === null) return t;
  return /^[0-9+()\-.\s]{5,30}$/.test(t.value) ? t : { error: 'Phone must be a valid phone number' };
}
function httpUrl(v, label, { required = false } = {}) {
  const t = text(v, label, { max: 500, required }); if (t.error || t.value === null) return t;
  return HTTP_URL_RE.test(t.value) ? t : { error: `${label} must be an http(s) link` };
}
function sdgIds(v) {
  if (v === undefined || v === null) return { value: [] };
  if (!Array.isArray(v) || v.length > 17 || !v.every(n => Number.isInteger(n) && n >= 1 && n <= 17)) return { error: 'sdgIds must be integers 1-17' };
  return { value: [...new Set(v)].sort((a, b) => a - b) };
}
function money(v, label, { min = 0.01, max = 1e9 } = {}) {
  if (v === undefined || v === null || v === '') return { error: `${label} is required` };
  const n = Number(v);
  if (typeof v === 'boolean' || !isFinite(n) || n < min || n > max) return { error: `${label} must be a number between ${min} and ${max}` };
  return { value: Math.round(n * 100) / 100 };
}
function date(v, label) {
  if (v === undefined || v === null || v === '') return { value: null };
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(v)) return { error: `${label} must be a date (YYYY-MM-DD)` };
  const d = new Date(v); return isNaN(d) ? { error: `${label} is not a valid date` } : { value: d };
}

// An image URL is only accepted if it points into the submissions upload
// area of OUR public bucket — so a submitter can't plant an arbitrary
// external URL (tracking pixel, hotlinked content) into a page that will
// later be public.
export function uploadUrlPrefix(env) {
  return `${String(env.SUPABASE_URL || '').replace(/\/+$/, '')}/storage/v1/object/public/${SUBMISSION_BUCKET}/${SUBMISSION_PREFIX}`;
}
function uploadedImage(v, label, env, { required = false } = {}) {
  if (v === undefined || v === null || v === '') return required ? { error: `${label} is required` } : { value: null };
  if (typeof v !== 'string' || v.length > 600) return { error: `${label} is not a valid uploaded image` };
  const prefix = uploadUrlPrefix(env);
  if (!env.SUPABASE_URL || !v.startsWith(prefix) || /[\s?#]|\.\./.test(v.slice(prefix.length)) || v.length === prefix.length) return { error: `${label} must be an image uploaded through the form` };
  return { value: v };
}
function gallery(v, label, env, { min = 0, max }) {
  if (v === undefined || v === null) v = [];
  if (!Array.isArray(v)) return { error: `${label} must be a list` };
  if (v.length > max) return { error: `${label}: at most ${max} images` };
  const out = [];
  for (const it of v) {
    const url = typeof it === 'string' ? it : it?.url;
    const u = uploadedImage(url, label, env, { required: true }); if (u.error) return u;
    const caption = typeof it === 'object' ? text(it.label, 'Caption', { max: 120, required: false }) : { value: null };
    if (caption.error) return caption;
    out.push(caption.value ? { url: u.value, label: caption.value } : { url: u.value });
  }
  if (out.length < min) return { error: `${label}: at least ${min} image${min > 1 ? 's' : ''} required` };
  return { value: out };
}

// Runs [key, result] pairs; first failure wins.
function collect(pairs) {
  const out = {};
  for (const [k, r] of pairs) { if (r.error) return { error: r.error }; out[k] = r.value; }
  return { value: out };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function parseContact(b) {
  return collect([['name', text(b.contactName, 'Your name', { max: 100 })], ['email', email(b.contactEmail, 'Your email')], ['phone', phone(b.contactPhone)]]);
}
function parseCharityFields(b, env, prefix = '') {
  return collect([
    ['name', text(b.name, `${prefix}Charity name`, { max: 140 })],
    ['mission', text(b.mission, `${prefix}Mission`, { max: 5000, multiline: true, required: !prefix })],
    ['registrationNo', text(b.registrationNo, `${prefix}Registration number`, { max: 60, required: false })],
    ['websiteUrl', httpUrl(b.websiteUrl, `${prefix}Website`)],
    ['logo', uploadedImage(b.logo, `${prefix}Logo`, env)],
    ['sdgIds', sdgIds(b.sdgIds)],
  ]);
}

// ── per-type parsers ────────────────────────────────────────────────────
export function parseSubmission(type, body, env) {
  if (!isObj(body)) return { error: 'Invalid request' };
  const contact = parseContact(body); if (contact.error) return contact;

  if (type === 'charity') {
    const f = parseCharityFields(body, env); if (f.error) return f;
    const t = body.target === undefined || body.target === null || body.target === '' ? { value: 0 } : money(body.target, 'Fundraising target', { min: 0 });
    const g = gallery(body.images, 'Gallery', env, { max: 12 });
    const r = collect([['target', t], ['images', g]]); if (r.error) return r;
    return { contact: contact.value, entity: { ...f.value, ...r.value } };
  }

  if (type === 'campaign') {
    if (!isObj(body.charity)) return { error: 'Charity details are required' };
    const ch = parseCharityFields(body.charity, env, 'Charity: '); if (ch.error) return ch;
    const f = collect([
      ['title', text(body.title, 'Campaign title', { max: 140 })],
      ['story', text(body.story, 'Story', { max: 20000, min: 20, multiline: true })],
      ['targetAmount', money(body.targetAmount, 'Target amount')],
      ['headerImage', uploadedImage(body.headerImage, 'Header image', env)],
      ['campaignVideo', httpUrl(body.campaignVideo, 'Campaign video')],
      ['images', gallery(body.images, 'Gallery', env, { max: 12 })],
      ['sdgIds', sdgIds(body.sdgIds)],
      ['startDate', date(body.startDate, 'Start date')],
      ['endDate', date(body.endDate, 'End date')],
    ]); if (f.error) return f;
    if (f.value.startDate && f.value.endDate && f.value.endDate < f.value.startDate) return { error: 'End date must be after start date' };
    return { contact: contact.value, entity: f.value, extra: { charity: ch.value } };
  }

  // The creator form: ARTWORK, MUSIC or BOOK (the fields adapt to the category, like the admin product form).
  if (type === 'artwork') {
    if (!isObj(body.artist)) return { error: 'Your creator details are required' };
    const a = collect([
      ['displayName', text(body.artist.displayName, 'Your name (as it should appear)', { max: 100 })],
      ['biography', text(body.artist.biography, 'Biography', { max: 3000, multiline: true, required: false })],
      ['location', text(body.artist.location, 'Location', { max: 100, required: false })],
      ['websiteUrl', httpUrl(body.artist.websiteUrl, 'Website')],
    ]); if (a.error) return a;
    const cat = body.category === undefined ? 'ARTWORK' : body.category;
    if (!['ARTWORK', 'MUSIC', 'BOOK'].includes(cat)) return { error: 'Category must be ARTWORK, MUSIC or BOOK' };
    let year = null;
    if (body.year !== undefined && body.year !== null && body.year !== '') {
      year = Number(body.year);
      if (!Number.isInteger(year) || year < 1800 || year > new Date().getFullYear() + 1) return { error: 'Year is not valid' };
    }
    const maxImages = cat === 'ARTWORK' ? 8 : cat === 'BOOK' ? 2 : 1;
    const common = collect([
      ['title', text(body.title, 'Title', { max: 140 })],
      ['description', text(body.description, 'Description', { max: 5000, multiline: true, required: false })],
      ['images', gallery(body.images, cat === 'ARTWORK' ? 'Images' : 'Cover image', env, { min: 1, max: maxImages })],
      ['sdgIds', sdgIds(body.sdgIds)],
    ]); if (common.error) return common;

    if (cat === 'ARTWORK') {
      const ed = body.editionType === undefined ? 'ORIGINAL' : body.editionType;
      if (!['ORIGINAL', 'PRINT', 'EDITION'].includes(ed)) return { error: 'Edition type must be ORIGINAL, PRINT or EDITION' };
      // How the creator wants to deal with FastTackle: outright sale, consignment and/or a print licence.
      if (!isObj(body.offer)) return { error: 'Choose how you would like to offer this work' };
      const o = body.offer;
      for (const k of ['outright', 'consignment', 'printLicence']) if (o[k] !== undefined && typeof o[k] !== 'boolean') return { error: 'Invalid sale option' };
      if (!o.outright && !o.consignment && !o.printLicence) return { error: 'Choose at least one: outright sale, consignment or print licence' };
      let editionSize = null;
      if (o.printLicence) {
        editionSize = Number(o.editionSize);
        if (!Number.isInteger(editionSize) || editionSize < 2 || editionSize > 10000) return { error: 'Edition size must be a whole number from 2 to 10,000' };
      }
      const f = collect([
        ['basePrice', money(body.basePrice, 'Price', { max: 10_000_000 })],
        ['medium', text(body.medium, 'Medium', { max: 80, required: false })],
        ['dimensions', text(body.dimensions, 'Dimensions', { max: 80, required: false })],
      ]); if (f.error) return f;
      return { contact: contact.value, entity: { ...common.value, ...f.value, category: cat, editionType: ed, year }, extra: { artist: a.value, offer: { outright: !!o.outright, consignment: !!o.consignment, printLicence: !!o.printLicence, editionSize } } };
    }

    // MUSIC / BOOK: delivered as a link, priced per edition — the same rules the admin product form enforces.
    let pages = null;
    if (body.pages !== undefined && body.pages !== null && body.pages !== '') { pages = Number(body.pages); if (!Number.isInteger(pages) || pages < 1 || pages > 10000) return { error: 'Pages must be a whole number' }; }
    const link = httpUrl(body.digitalAccessUrl, cat === 'MUSIC' ? 'Listen / stream link' : 'Read link'); if (link.error) return link;
    const price = (k, label) => (body[k] === undefined || body[k] === null || body[k] === '' ? { value: null } : money(body[k], label, { max: 10_000_000 }));
    const bp = price('basePrice', 'Price'), dp = price('digitalPrice', 'Digital price'), pp = price('physicalPrice', 'Physical price');
    for (const r of [bp, dp, pp]) if (r.error) return r;
    const dig = checkDigitalProduct({
      category: cat, creatorName: a.value.displayName, digitalAccessUrl: link.value || '', bookFormat: body.bookFormat,
      digitalPrice: dp.value, physicalPrice: pp.value, isbn: body.isbn, publisher: body.publisher, language: body.language,
    });
    if (dig.error) return { error: dig.error };
    if (cat === 'MUSIC' && !(bp.value > 0)) return { error: 'Price is required' };
    return {
      contact: contact.value,
      entity: { ...common.value, ...dig.derived, category: cat, ...(cat === 'MUSIC' ? { basePrice: bp.value } : {}), year, pages },
      extra: { artist: a.value },
    };
  }
  return { error: 'Unknown submission type' };
}

export function uniqueSlug(title) {
  return `${slugify(title).slice(0, 60) || 'submission'}-${crypto.randomUUID().slice(0, 6)}`;
}

// ── placeholder accounts (no password → can never log in; .invalid → mail can never be delivered)
export const placeholderEmail = (kind) => `${kind}-${crypto.randomUUID()}@${kind}.fasttackle.invalid`;

export async function createCharityRecord(tx, data, { submissionStatus }) {
  const user = await tx.user.create({ data: { email: placeholderEmail('charity'), role: 'CHARITY', firstName: data.name } });
  return tx.charityProfile.create({ data: { ...data, userId: user.id, submissionStatus } });
}

// Pending artworks are parked on the platform's own (admin) artist profile
// because Product.artistId is required; approval makes the admin choose the
// real artist, so nothing ever goes public under the house name by accident.
export async function getHouseArtist(prisma) {
  return prisma.artistProfile.findFirst({ where: { user: { role: 'ADMIN' } }, orderBy: { createdAt: 'asc' }, select: { id: true } });
}

// ── agreement acceptance ───────────────────────────────────────────────
export const AGREEMENT_FOR = { charity: 'partner-agreement', campaign: 'partner-agreement', artwork: 'creator-agreement' };

// Validates the typed signature (a full name).
export function parseSignature(v) { return text(v, 'Your full name', { max: 100, min: 2 }); }
