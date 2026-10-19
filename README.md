# GoodyCleaning

GoodyCleaning is a standalone Next.js application for carpet cleaning, deep cleaning, and before/after tenancy cleaning. Its homepage includes a service and property selector, responsive service cards, enquiry actions, FAQs, customer stories, and animations that respect reduced-motion preferences.

The initial launch uses **enquiry mode**. Customers submit a quote request on the website or use the phone links. The form requires a name, valid email address, and phone number and sends the full enquiry to **support@goodyvan.com** through Gmail OAuth. This flow needs a configured email connection, but no database or payment provider. No tariff is displayed before prices are approved. The full instant-booking form stays hidden unless `NEXT_PUBLIC_INSTANT_BOOKING_ENABLED=true` is set before building.

Launch contact details: **0800 001 6171**, direct mobile **+44 7771 114041**, and **support@goodyvan.com**. Enquiry success appears only after Gmail accepts the team notification. Delivery failures preserve the customer's details and offer a retry or phone call.

Team notifications and customer acknowledgements use branded HTML, a plain-text alternative, and the original cleaning logo embedded as an inline PNG. The customer email confirms receipt and explains that the team will review the enquiry and get back to them; it does not confirm a booking or promise a response time. Both messages send from `GoodyCleaning <support@goodyvan.com>`. Replies to the team notification go to the customer; replies to the acknowledgement go to support.

Before deploying this mailer, verify `support@goodyvan.com` as an authorized Gmail sending address and set `GMAIL_SENDER` to that address. A receiving inbox or working notification to support does not establish send-as authorization. If team delivery fails, no acknowledgement is attempted. If only the acknowledgement fails, the enquiry remains successful and the form explains that resubmission is unnecessary.

The application has its own [GitHub repository](https://github.com/FarzinKhaledi/GoodyCleaning). GoodyVan remains a separate application.

## Domains and referrals

The primary production address is **https://goodycleaning.co.uk**. Both the `.co.uk` and `.com` domains are managed through GoDaddy. Configure `goodycleaning.com` and the `www` variants to redirect permanently to the primary `.co.uk` address, preserving paths and query parameters. DNS, HTTPS, redirects, and deployment domains must be configured in the hosting/domain accounts; this repository does not provision them.

GoodyVan's cleaning introduction lives at `/services/cleaning`, with links from its homepage, service directory, navigation, and footer. Its enquiry links lead to `https://goodycleaning.co.uk/` with referral parameters and the `#booking` anchor. GoodyCleaning's footer links back to GoodyVan for moving services. Each application handles its own enquiries and bookings.

### Manual DNS setup

1. Open [GoodyCleaning's Vercel domain settings](https://vercel.com/farzinkhaledis-projects/goody-cleaning/settings/domains). Add `goodycleaning.co.uk`, `www.goodycleaning.co.uk`, `goodycleaning.com`, and `www.goodycleaning.com` to this project. Complete any ownership verification Vercel requests first.
2. Copy the exact DNS record names, types, and values shown by Vercel into GoDaddy for each domain. Keep existing email records. Do not guess the A/CNAME values or use values copied from another project.
3. Set `goodycleaning.co.uk` as the production destination. The application permanently redirects the other three hostnames to it, preserving paths and query parameters.
4. Once Vercel reports valid configuration and HTTPS is ready, test all four addresses and a URL with a path and query string. Confirm the final host is `goodycleaning.co.uk`.

The release must also be deployed to Vercel's production environment; adding DNS to a project does not promote a preview deployment. Preview links may require Vercel sign-in according to the project's deployment protection settings.

## Local development

Use Node.js 20.9 or later and install dependencies:

```bash
npm ci
```

For a new checkout, copy the safe environment template and supply your own values. Preserve an existing `.env.local` file instead of overwriting it.

```bash
cp .env.example .env.local
```

Generate a private Auth.js secret with `openssl rand -base64 32`. Keep `NEXT_PUBLIC_SITE_URL` and `AUTH_URL` set to `http://localhost:3000` locally. Never commit environment files containing real credentials.

```bash
npm run dev
```

Open [the local site](http://localhost:3000) or [admin login](http://localhost:3000/admin/login). The homepage renders without backend services; enquiry submission needs the Gmail OAuth variables below. Missing email configuration returns an error without claiming the enquiry was sent. Keep `NEXT_PUBLIC_INSTANT_BOOKING_ENABLED=false` for this mode. The complete booking backend and offline tests remain available locally; instant bookings, admin quote management, and admin authentication require their configured services.

## Environment variables

Configure private production values in the hosting project, separately from development and preview values.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public site origin; use `https://goodycleaning.co.uk` in production. Used in metadata, email links, and payment redirects. |
| `AUTH_URL` | Authentication origin; use `https://goodycleaning.co.uk` in production. |
| `NEXT_PUBLIC_INSTANT_BOOKING_ENABLED` | Defaults to `false`. Enquiry mode shows the website enquiry form and phone links. Set `true` before building only after prices and all booking services are approved and ready. |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Server-only OAuth credentials for enquiry delivery, with Gmail send permission. |
| `GMAIL_SENDER` | Must be `support@goodyvan.com`, authorized as the connected Gmail account or a verified send-as address. |
| `GMAIL_USER` | Optional sender fallback when `GMAIL_SENDER` is empty; must also be `support@goodyvan.com`. |
| `AUTH_SECRET` | Private, randomly generated Auth.js secret. |
| `DATABASE_URL` | Dedicated GoodyCleaning Postgres database connection string. |
| `REVOLUT_SECRET_KEY` | Merchant API secret for the intended sandbox or live account. `REVOLUT_API_KEY` is accepted as a legacy alias. |
| `REVOLUT_API_URL` | Optional explicit API base. Use the sandbox or production endpoint for the same environment as the key. |
| `REVOLUT_WEBHOOK_SECRET` | Signing secret from the webhook registered in that Revolut environment. |
| `RESEND_API_KEY` | Required for the separate instant-booking/admin transactional email workflows. |
| `MAIL_FROM` | Sender on a domain verified in Resend, such as `GoodyCleaning <hello@goodycleaning.co.uk>`. |
| `ADMIN_EMAIL` | Mailbox for new quote requests and payment alerts. |
| `ADMIN_EMAIL_LOGIN` | Explicit email for the admin account created by the seed command. |
| `ADMIN_PASSWORD` | Unique admin seed password: at least 12 characters and at most 72 UTF-8 bytes. |

`NEXT_PUBLIC_REVOLUT_PUBLIC_KEY` is not used by the hosted-checkout integration. Keep merchant secrets server-side.

## Database and admin setup

Point `DATABASE_URL` to the intended GoodyCleaning database before running database commands. Schema and account setup write to that database; review the target before using them in production.

For a new development database:

```bash
npm run db:push
npm run db:seed
```

The seed command requires explicit `ADMIN_EMAIL_LOGIN` and `ADMIN_PASSWORD`. It creates a missing admin account and inserts no example reviews. Existing admins and their passwords remain unchanged. Changing the seed environment variables does not reset an existing password; rotate an existing account through a deliberate credential update process.

`db:generate`, `db:migrate`, and `db:studio` are available for managed schema work. Review generated migrations before applying them. Production setup is a separate operator action and is not performed by the application build.

## Checks and production commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

The offline tests cover booking validation, invalid JSON, webhook signatures, and missing production service configuration. They do not verify live payments, email delivery, or database transaction behavior. A build can read published testimonials from the configured database; use the intended environment when building.

On Vercel, import the existing GoodyCleaning repository as its own project, configure its environment variables, deploy it, and attach the GoodyCleaning domains to that project. Configure the production origin before building so metadata and links resolve to the canonical domain.

## Booking and payment behavior

Enquiry mode is the default. Customers submit their name, email, phone, service, and property size to `/api/enquiries`; postcode, preferred date, and message are optional. The endpoint sends a branded notification to the fixed support mailbox and then acknowledges the customer. It does not create an admin quote or database record. Customer acknowledgements include a request summary but exclude arbitrary free-text notes. The endpoint validates contact details, bounds request size, checks browser origin, and applies a honeypot and per-instance burst limit. Hosting-level limits can supplement that burst limit across instances. No prices or live payment form are shown. The instant checkout API rejects submissions while instant booking is disabled.

When `NEXT_PUBLIC_INSTANT_BOOKING_ENABLED=true`, studios, one-bedroom homes, and two-bedroom homes use the price table in `src/lib/pricing.ts` and proceed to Revolut hosted checkout. Homes with three or more bedrooms and commercial properties request a custom quote. Admins can review requests and send payment links from `/admin`.

Keep the flag false until the business has approved prices, coverage, and contact details, and the database, correct live Revolut account/key, signed webhook, and production email delivery are ready. The current price table is labelled as placeholder pricing. Do not expose it as a production tariff. Changing this public flag requires rebuilding the application.

Register the production Revolut webhook at:

```text
https://goodycleaning.co.uk/api/webhooks/revolut
```

Subscribe to `ORDER_COMPLETED` and configure its signing secret. Payments are confirmed by verified webhooks, never by visiting the success page. The success page displays the recorded status and stays outside the sitemap with indexing disabled.

Sandbox and production accounts use different API endpoints and signing secrets. Missing payment credentials fail in production; a development-only mock checkout is not payment confirmation. Production email also fails when `RESEND_API_KEY` is absent. Set a verified `MAIL_FROM`; the `onboarding@resend.dev` fallback is only suitable for development/testing.

## Content before launch

Confirm business contact information, social links, and service coverage in `src/lib/config.ts`, and publish appropriate privacy and booking terms. Keep placeholder prices hidden in enquiry mode; replace them with approved prices before enabling instant booking. Customer stories appear only when genuine reviews have been approved and published in the database. Historical seed examples are excluded, and the section hides when there are no customer reviews. Seeding does not publish sample reviews.

## Main files

| Location | Responsibility |
| --- | --- |
| `src/app/(site)/page.tsx` | Public homepage and section composition. |
| `src/components/sections/` | Header, hero, services, booking, stories, FAQs, and footer. |
| `src/components/providers/PageMotion.tsx` | Homepage motion and reduced-motion handling. |
| `src/app/admin/` | Admin login, quotes, and bookings. |
| `src/app/api/` | Booking, quote, authentication, and webhook routes. |
| `src/lib/db/` | Drizzle schema and database connection. |
| `src/lib/mail/` | Transactional email delivery and templates. |
| `src/lib/revolut.ts` | Hosted checkout creation and webhook signature validation. |
| `tests/` | Offline regression tests. |
