import { readFileSync } from 'fs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

let envRaw = readFileSync('.env', 'utf8');
if (envRaw.charCodeAt(0) === 0xFEFF) envRaw = envRaw.slice(1);
const env = {};
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

try {
  console.log('--- GET /admin/orders query shape ---');
  const where = {};
  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where, skip: 0, take: 20, orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { firstName: true, lastName: true, email: true } },
        items: { take: 1, select: { product: { select: { title: true, images: true } } } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  console.log('total orders:', total);
  console.log('items returned:', items.length);
  if (items[0]) console.log('sample row:', JSON.stringify(items[0], null, 2).slice(0, 800));

  if (items[0]) {
    console.log('\n--- GET /admin/orders/:id query shape ---');
    const order = await prisma.order.findUnique({
      where: { id: items[0].id },
      include: {
        buyer: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        items: {
          include: {
            product: { select: { title: true, images: true, slug: true, category: true, artist: { select: { displayName: true } }, charity: { select: { name: true } } } },
            variation: true,
          },
        },
      },
    });
    const withPayout = order.items.map(item => {
      const lineTotal = Number(item.unitPrice) * item.quantity;
      const artistPayout = Math.round((lineTotal - Number(item.charitySplitAmt) - Number(item.platformFeeAmt) + Number.EPSILON) * 100) / 100;
      return { title: item.product?.title, quantity: item.quantity, unitPrice: Number(item.unitPrice), lineTotal, charitySplitAmt: Number(item.charitySplitAmt), platformFeeAmt: Number(item.platformFeeAmt), artistPayout };
    });
    console.log('order id:', order.id, 'status:', order.status, 'buyer:', order.buyer?.email || order.buyerEmail);
    console.log('shippingAddress:', JSON.stringify(order.shippingAddress));
    console.log('computed line items:', JSON.stringify(withPayout, null, 2));
    // sanity: lineTotal - charitySplitAmt - platformFeeAmt - artistPayout should be ~0
    for (const it of withPayout) {
      const remainder = Math.round((it.lineTotal - it.charitySplitAmt - it.platformFeeAmt - it.artistPayout) * 100) / 100;
      console.log(`  reconciliation check for "${it.title}": remainder = ${remainder} (should be 0)`);
    }
  } else {
    console.log('\nNo orders exist in the live DB — cannot smoke-test /admin/orders/:id or line-item math against real data.');
  }

  console.log('\n--- filter smoke test: status=PENDING, buyerEmail contains "a" ---');
  const filtered = await prisma.order.findMany({
    where: { status: 'PENDING', buyerEmail: { contains: 'a', mode: 'insensitive' } },
    take: 5,
  });
  console.log('filtered count:', filtered.length);

} catch (e) {
  console.error('ERROR:', e.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  await pool.end();
}
