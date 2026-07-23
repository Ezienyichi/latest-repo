# FastTackle Africa

> Where Art Funds Change — A multi-sided marketplace connecting artists, charities, and buyers around the UN's 17 SDGs.

## Stack
- **Frontend**: React 18 + Vite, served as a Cloudflare Pages static site
- **Backend**: Hono, running as Cloudflare Pages Functions (`functions/`)
- **Database**: Supabase Postgres, accessed via Prisma ORM over a Cloudflare Hyperdrive binding
- **Storage**: Supabase Storage (signed upload/download URLs)

## Deployment

### 1. Configure environment
Three separate places need the same credentials (DB connection strings, JWT secret, Supabase URL/keys):
- `.env` — used by Prisma CLI (`db push`, `seed.js`) when run locally
- `.dev.vars` — used by `wrangler pages dev` for local Functions development
- **Cloudflare secrets** — used in production, set via `wrangler pages secret put <NAME> --project-name=fasttackle`

See `.env.example` for the full variable list. The Hyperdrive binding itself (`DATABASE_URL` in production) is configured in `wrangler.toml`, not as a secret.

### 2. Push schema + seed data
```bash
npm install
npm run db:push        # prisma db push — declarative schema sync, no migration files
node prisma/seed.js    # demo data (artists, charities, products, admin account)
```

### 3. Build and deploy
```bash
npm run build
wrangler pages deploy dist --project-name=fasttackle
```

### Demo Accounts (after seeding)

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
- **Backend**: Hono, on Cloudflare Pages Functions
- **Database**: Supabase Postgres via Prisma ORM + Cloudflare Hyperdrive
- **Auth**: JWT with bcrypt
- **Payments**: Stripe (optional — demo mode works without)
- **Deploy**: Cloudflare Pages (static site + Functions)
