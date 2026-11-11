// Loads the five legal pages from legal-terms.md (repo root) as version 1 each.
//
//   node scripts/seed-legal.mjs            publish any page that has no version yet
//   node scripts/seed-legal.mjs --dry-run  show what would be published (and what was stripped), change nothing
//   node scripts/seed-legal.mjs --force    publish a NEW version for pages whose text changed
//   node scripts/seed-legal.mjs path.md    use another file
//
// Existing versions are never touched; this only ever adds.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { parseLegalTerms } from './legalParse.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const file = path.resolve(args.find(a => !a.startsWith('--')) || path.join(root, 'legal-terms.md'));
const TITLES = { terms: 'Terms of Use and Sale', privacy: 'Privacy Policy', returns: 'Shipping, Returns and Buyer Protection', 'creator-agreement': 'Creator Agreement', 'partner-agreement': 'Charity and Campaign Partner Agreement' };

if (!fs.existsSync(file)) { console.error(`Not found: ${file}\nPut legal-terms.md in the repo root (or pass its path), or paste each page into Admin → Legal.`); process.exit(1); }

let parsed;
try { parsed = parseLegalTerms(fs.readFileSync(file, 'utf8')); } catch (e) { console.error('Refusing to publish: ' + e.message); process.exit(1); }
console.log(`Read ${path.basename(file)}: ${parsed.sections.length} sections.`);
for (const r of parsed.removed) console.log(`  stripped (not for publication): "${r}"`);
for (const s of parsed.sections) console.log(`  ${s.n}. ${s.heading}  →  /legal/${s.slug}  (${s.body.length.toLocaleString()} chars)`);
if (flags.has('--dry-run')) { console.log('Dry run — nothing written.'); process.exit(0); }

const prisma = new PrismaClient();
try {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } });
  if (!admin) throw new Error('No admin user to attribute the publish to.');
  for (const s of parsed.sections) {
    const cur = await prisma.legalDocument.findFirst({ where: { slug: s.slug }, orderBy: { version: 'desc' } });
    if (cur && !flags.has('--force')) { console.log(`  ${s.slug}: already at v${cur.version} — skipped (use --force to add a new version)`); continue; }
    if (cur && cur.body === s.body) { console.log(`  ${s.slug}: unchanged at v${cur.version}`); continue; }
    const version = (cur?.version ?? 0) + 1;
    await prisma.legalDocument.create({ data: { slug: s.slug, version, title: TITLES[s.slug], body: s.body, changeNote: 'Loaded from legal-terms.md', createdBy: admin.id } });
    console.log(`  ${s.slug}: published v${version}`);
  }
} finally { await prisma.$disconnect(); }
