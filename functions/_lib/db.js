// Prisma on Cloudflare Workers via @prisma/adapter-pg + Hyperdrive.
// A Pool/adapter/client is created per-request (Cloudflare's documented
// pattern for Hyperdrive) and the pool is closed after the response via
// waitUntil, since Hyperdrive — not this Pool — owns the real connection pool.
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export async function withPrisma(c, next) {
  const connectionString = c.env.HYPERDRIVE?.connectionString || c.env.DATABASE_URL;
  const url = new URL(connectionString);
  const pool = new Pool({
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)) || 'postgres',
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  c.set('prisma', prisma);
  try {
    await next();
  } finally {
    c.executionCtx.waitUntil(pool.end());
  }
}
