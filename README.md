# Change Art Gallery — Deploy-Ready for Netlify

> Where Art Funds Change — A multi-sided marketplace connecting artists, charities, and buyers around the UN's 17 SDGs.

## One-Click Netlify Deploy

### 1. Set Up Database
Create a free PostgreSQL database at [Supabase](https://supabase.com), [Neon](https://neon.tech), or [Railway](https://railway.app). Copy the connection string.

### 2. Deploy to Netlify
1. Push this folder to a **GitHub repo**
2. Go to [Netlify](https://app.netlify.com) → "Add new site" → "Import an existing project"
3. Connect your GitHub repo
4. Build settings should auto-detect from `netlify.toml`:
   - **Build command**: `npm install && npx prisma generate && npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
5. Add **Environment Variables** in Netlify dashboard:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | Any long random string |
| `JWT_EXPIRES_IN` | `7d` |
| `STRIPE_SECRET_KEY` | `sk_test_...` (optional) |
| `VITE_STRIPE_PK` | `pk_test_...` (optional) |

6. Click **Deploy**

### 3. Seed Demo Data
After first deploy, run the seed script via Netlify CLI or connect to your database directly:

```bash
# Local
npm install
npx prisma db push
node prisma/seed.js
```

Or use Supabase SQL editor to verify tables were created.

### 4. Demo Accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@changeartgallery.com | Admin123! |
| Buyer | buyer@demo.com | Buyer123! |
| Artist | amara@demo.com | Artist123! |
| Charity | wateraid@demo.com | Charity123! |

## Project Structure

```
change-art-gallery/
├── index.html                    # Vite entry
├── package.json                  # Unified deps (React + Express + Prisma)
├── netlify.toml                  # Build + Functions + Redirects config
├── vite.config.js                # Vite dev server config
├── .env.example                  # Environment variable template
├── prisma/
│   ├── schema.prisma             # 18 database models
│   └── seed.js                   # Demo data (11 artists, 4 charities, 21 products)
├── backend/                      # API logic (used by Netlify Functions)
│   ├── routes/
│   │   ├── auth.js               # Register, login, verify, profile setup
│   │   ├── products.js           # CRUD, search, filter, reviews
│   │   ├── orders.js             # Checkout, Stripe, coupons, stock management
│   │   ├── artists.js            # Public artist listing
│   │   ├── charities.js          # Public charity listing + funder signup
│   │   ├── dashboard.js          # Artist + Charity + Admin dashboards
│   │   ├── certificates.js       # Certificate verification + buyer certs
│   │   └── admin.js              # User management, moderation, analytics
│   ├── middleware/auth.js         # JWT auth + role guards
│   └── utils/db.js               # Prisma client
├── netlify/functions/
│   └── api.js                    # Express → serverless wrapper
└── src/                          # React frontend
    ├── main.jsx
    ├── App.jsx                   # All routes (30+)
    ├── components/
    │   ├── layout/               # Navbar (mega-menu, mobile drawer), Footer
    │   └── ui/                   # Toasts, CertificateModal, ProductAddons,
    │                             # SocialShare, EbookPreview, MusicPlayer,
    │                             # GraphicPreview, AnimationPreview, IncludesList
    ├── context/                  # AuthContext, CartContext, ThemeContext
    ├── data/constants.js         # SDGs, digital categories
    ├── pages/                    # 20 page components
    │   ├── HomePage.jsx          # Video hero, stats, What We Provide
    │   ├── ShopPage.jsx          # Marketplace with filters
    │   ├── ProductPage.jsx       # Gallery, add-ons, certificate, reviews
    │   ├── DigitalsPage.jsx      # eBooks, Music, Graphics, Animation
    │   ├── ArtistsPage.jsx       # Artist directory
    │   ├── ArtistProfilePage.jsx # Portfolio, about, exhibitions, awards
    │   ├── CharitiesPage.jsx     # Charity directory
    │   ├── CharityProfilePage.jsx # Mission, resources, partners
    │   ├── CartPage.jsx          # Coupons, impact summary
    │   ├── CheckoutPage.jsx      # 3-step wizard
    │   ├── OrderConfirmationPage.jsx
    │   ├── OrdersPage.jsx        # Order history
    │   ├── VerifyCertificatePage.jsx # Public cert verification
    │   ├── MyCertificatesPage.jsx
    │   ├── RegisterPage.jsx      # Role selection + details
    │   ├── LoginPage.jsx         # Demo account quick-login
    │   ├── SetupArtistPage.jsx   # Artist profile form
    │   ├── SetupCharityPage.jsx  # Charity application form
    │   └── dashboard/
    │       ├── DashboardRouter.jsx
    │       ├── DashboardShell.jsx  # Sidebar layout
    │       ├── ArtistOverview.jsx  # Stats, chart, quick actions
    │       ├── ArtworkManager.jsx  # Table + 5-step wizard
    │       ├── ArtistOrders.jsx
    │       ├── ArtistEarnings.jsx  # Revenue breakdown
    │       ├── ArtistProfileEditor.jsx # 5-tab editor
    │       ├── CharityOverview.jsx
    │       ├── CharityFunders.jsx  # Privacy-first management
    │       ├── CharityMessages.jsx # Compose + templates + history
    │       ├── CharityResources.jsx # Upload + visibility toggle
    │       └── AdminDashboard.jsx  # Analytics, moderation, users
    ├── styles/globals.css         # Complete design system (light/dark)
    └── utils/api.js               # API client with all endpoints

## Features

### For Artists
- List artwork & digital products (eBooks, music, graphics, animation)
- 5-step artwork upload wizard
- Certificate of Authenticity auto-generation
- Earnings dashboard with monthly charts
- Profile editor (statement, bio, exhibitions, awards, social links)

### For Charities
- Funder management (privacy-first — anonymous counts)
- Message composer with reusable templates
- Resource repository with public/funder-only visibility
- Fundraising progress tracking

### For Buyers
- Browse artworks + digital products with filters
- Product gallery with hover zoom + lightbox
- Coupon codes (IMPACT10, WELCOME15, ARTFREE)
- 3-step checkout with Stripe integration
- Certificate collection
- Order history with status tracking

### For Admins
- Platform analytics (revenue, users, orders)
- Artist & charity verification workflow
- Product moderation (approve/reject)
- User management with role filters
```

## Tech Stack
- **Frontend**: React 18 + Vite + React Router
- **Backend**: Express (as Netlify Functions)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT with bcrypt
- **Payments**: Stripe (optional — demo mode works without)
- **Deploy**: Netlify (static site + serverless functions)
