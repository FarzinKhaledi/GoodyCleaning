# Goodycleaning

Professional cleaning services website with cinematic 3D scroll storytelling, instant Revolut checkout, and admin quote management.

## Features

- **3D scroll-story homepage** — React Three Fiber scenes driven by scroll (particles, house, cleaning tools)
- **Three services** — Carpet Cleaning, Deep Cleaning, Before & After Tenancy Cleaning
- **Instant booking** — Studio / 1-bed / 2-bed jobs checkout via Revolut (Apple Pay, Google Pay, cards)
- **Admin quotes** — 3+ bed and commercial jobs routed to admin dashboard
- **Confirmation emails** — Automated via Resend on payment completion
- **Admin dashboard** — Review requests, set prices, send quote emails with pay links

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- React Three Fiber + drei + GSAP + Lenis
- Tailwind CSS + shadcn-style UI components
- Postgres (Neon) + Drizzle ORM
- Auth.js (Credentials) for admin
- Revolut Merchant API for payments
- Resend + React Email for transactional email

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Generate an auth secret:

```bash
openssl rand -base64 32
```

### 3. Set up database

Create a Neon Postgres database and set `DATABASE_URL` in `.env.local`, then:

```bash
npm run db:push
npm run db:seed
```

Default admin login: `admin@goodycleaning.co.uk` / `admin123`

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the site and [http://localhost:3000/admin](http://localhost:3000/admin) for the dashboard.

## Deployment (Vercel)

1. Push to GitHub and import into Vercel
2. Add all environment variables from `.env.example`
3. Set `NEXT_PUBLIC_SITE_URL` to your production domain
4. Run `npm run db:push && npm run db:seed` against your production database
5. Configure Revolut webhook URL: `https://yourdomain.com/api/webhooks/revolut`

### Revolut Setup

1. Create a Revolut Business Merchant account
2. Generate sandbox API keys for testing
3. Set `REVOLUT_API_KEY`, `REVOLUT_API_URL`, and `REVOLUT_WEBHOOK_SECRET`
4. Switch to production API URL when going live

### Resend Setup

1. Create a Resend account and verify your domain
2. Set `RESEND_API_KEY` and `MAIL_FROM` to your verified sender

## Pricing

Edit placeholder prices in `src/lib/pricing.ts`. Contact info is in `src/lib/config.ts`.

## Project Structure

```
src/
├── app/
│   ├── (site)/page.tsx          # Homepage
│   ├── admin/                   # Admin dashboard
│   ├── api/                     # API routes
│   └── booking/success/         # Payment confirmation
├── components/
│   ├── sections/                # Hero, Services, Booking, etc.
│   ├── three/                   # 3D scroll scenes
│   └── ui/                      # UI components
└── lib/
    ├── db/                      # Drizzle schema
    ├── mail/                    # Email templates
    ├── pricing.ts               # Price table
    └── revolut.ts               # Payment integration
```
# GoodyCleaning
