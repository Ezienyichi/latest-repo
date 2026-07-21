import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { withPrisma } from './db.js';

import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import ordersRoutes from './routes/orders.js';
import artistsRoutes from './routes/artists.js';
import charitiesRoutes from './routes/charities.js';
import dashboardRoutes from './routes/dashboard.js';
import certificatesRoutes from './routes/certificates.js';
import adminRoutes from './routes/admin.js';
import settingsRoutes from './routes/settings.js';
import uploadsRoutes from './routes/uploads.js';

const app = new Hono();

app.use('/api/*', cors({
  origin: (origin, c) => c.env.CORS_ORIGIN || origin || '*',
  credentials: true,
}));
app.use('/api/*', withPrisma);

app.get('/api/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

app.route('/api/auth', authRoutes);
app.route('/api/products', productsRoutes);
app.route('/api/orders', ordersRoutes);
app.route('/api/artists', artistsRoutes);
app.route('/api/charities', charitiesRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/certificates', certificatesRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/uploads', uploadsRoutes);

app.onError((err, c) => {
  console.error('API Error:', err.message);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
