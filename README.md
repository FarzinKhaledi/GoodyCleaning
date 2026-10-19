# GoodyCleaning

GoodyCleaning is a standalone Next.js application for carpet cleaning, deep cleaning, and before/after tenancy cleaning. Its homepage includes a service and property selector, responsive service cards, enquiry actions, FAQs, customer stories, and animations that respect reduced-motion preferences.

The default is **enquiry mode**. The form requires a name, valid email address, and phone number. Every accepted enquiry is saved in the dedicated GoodyCleaning database before notification emails are attempted. Admins review the enquiry, set prices manually, and send an itemised quote with a secure Revolut payment link. The public site displays no automatic tariff. The legacy instant-booking form stays hidden unless `NEXT_PUBLIC_INSTANT_BOOKING_ENABLED=true` is set before building.

Launch contact details: **0800 001 6171**, direct mobile **+44 7771 114041**, and **support@goodyvan.com**. A database failure rejects submission before any email is sent. Once an enquiry is saved, email failure does not invite a duplicate submission: the form confirms receipt and explains if the acknowledgement could not be sent.

Enquiry notifications, customer acknowledgements, quotes, and payment confirmations use the verified Gmail connection with branded HTML, a plain-text alternative, and the original cleaning logo embedded as an inline PNG. All send from `GoodyCleaning <support@goodyvan.com>`. The acknowledgement confirms receipt and review; it does not confirm a booking or promise a response time. Replies to the team notification go to the customer; customer replies go to support.

Connect the support Google Workspace account with Gmail send permission and set `GMAIL_SENDER=support@goodyvan.com`. A different connected account may send as support only when that alias has been verified. The saved enquiry remains available in `/admin` if email delivery is unavailable. The Resend adapter is retained for legacy integrations; it is not required by this enquiry, admin quote, or payment-confirmation workflow.

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

Open [the local site](http://localhost:3000) or [admin login](http://localhost:3000/admin/login). The homepage renders without backend services, but **every enquiry submission requires the configured database and current schema**. Gmail is needed for notifications and acknowledgements; Revolut is needed when an admin issues a payable quote. Configure `AUTH_SECRET` and create an admin account before using the dashboard. Keep `NEXT_PUBLIC_INSTANT_BOOKING_ENABLED=false` for the manual quote workflow.

## Environment variables

Configure private production values in the hosting project, separately from development and preview values.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public site origin; use `https://goodycleaning.co.uk` in production. Used in metadata, email links, and payment redirects. |
| `AUTH_URL` | Authentication origin; use `https://goodycleaning.co.uk` in production. |
| `NEXT_PUBLIC_INSTANT_BOOKING_ENABLED` | Defaults to `false`. Enquiry mode shows the website enquiry form and phone links. Set `true` before building only after prices and all booking services are approved and ready. |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | Server-only credentials for the verified support Gmail connection, with send permission; used for enquiries, quotes, and payment confirmations. |
| `GMAIL_SENDER` | Must be `support@goodyvan.com`, authorized as the connected Gmail account or a verified send-as address. |
| `GMAIL_USER` | Optional sender fallback when `GMAIL_SENDER` is empty; must also be `support@goodyvan.com`. |
| `AUTH_SECRET` | Private, randomly generated Auth.js secret. |
| `DATABASE_URL` | Dedicated GoodyCleaning Postgres connection string; required for all enquiry submissions, admin data, and payment records. |
| `REVOLUT_SECRET_KEY` | Merchant API secret for the intended sandbox or live account. `REVOLUT_API_KEY` is accepted as a legacy alias. |
| `REVOLUT_API_URL` | Set explicitly for the intended environment: `https://merchant.revolut.com/api` in production or `https://sandbox-merchant.revolut.com/api` in sandbox. |
| `REVOLUT_ENVIRONMENT` | Optional explicit `production` or `sandbox`; when supplied, must match the API URL and key environment. |
| `REVOLUT_WEBHOOK_SECRET` | Signing secret belonging to the dedicated GoodyCleaning webhook endpoint in that Revolut environment. |
| `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_EMAIL` | Legacy Resend adapter settings only; not used for the current enquiry, admin quote, or payment-confirmation emails. |
| `ADMIN_EMAIL_LOGIN` | Explicit email for the admin account created by the seed command. |
| `ADMIN_PASSWORD` | Unique admin seed password: at least 12 characters and at most 72 UTF-8 bytes. |

`NEXT_PUBLIC_REVOLUT_PUBLIC_KEY` is not used by the hosted-checkout integration. Keep merchant secrets server-side.

## Database and admin setup

Google sign-in uses `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` from an OAuth web client. Add `https://goodycleaning.co.uk/api/auth/callback/google` to that client's authorised redirect URIs in Google Cloud, preserving all existing website and mail callbacks. For local development, register `http://localhost:3000/api/auth/callback/google`. Only basic identity scopes are requested; mail credentials and sending permissions stay separate.

Run `npm run admin:google -- --email <approved-email>` only for an explicitly authorised super admin. This applies the additive `drizzle/0002_google_admin.sql` migration and provisions that account as `SUPER_ADMIN` without creating a password or changing existing passwords and Google identity bindings. Existing password admins retain the `ADMIN` role. The command needs the intended database's private connection string and is not exposed on the website.

Google sign-in accepts only an active admin already provisioned in the database with a verified Google email. The first successful sign-in binds Google's stable account identifier. Later sign-ins must match that identifier. Sessions recheck the account's current status and role, so removed or disabled admins lose access without waiting for cookie expiry. The public login page provides no registration or role-selection option.

Point `DATABASE_URL` to the intended GoodyCleaning database before running database commands. Schema and account setup write to that database; review the target before using them in production.

For a new development database:

```bash
npm run db:push
npm run db:migrate-quotes
npm run db:seed
```

The seed command requires explicit `ADMIN_EMAIL_LOGIN` and `ADMIN_PASSWORD`. It creates a missing admin account and inserts no example reviews. Existing admins and their passwords remain unchanged. Changing the seed environment variables does not reset an existing password; rotate an existing account through a deliberate credential update process.

For an existing GoodyCleaning database with the initial schema, run `npm run db:migrate-quotes` before deploying this workflow. It applies the additive `drizzle/0001_quote_workflow.sql` migration in a transaction and preserves existing enquiries, admins, and bookings. It does not create the initial tables. Back up the intended production database and confirm its target before applying changes. An initial database still needs its base schema and an admin account.

Before deploying percentage discounts, run `npm run db:migrate-quote-discounts` against the intended database. The idempotent, transactional `drizzle/0003_quote_discounts.sql` migration adds the discount mode and percentage metadata. Existing quotes keep their fixed discounts and payment amounts. It does not issue payment links or send email.

`db:generate`, `db:migrate`, and `db:studio` remain available for managed schema work. Review migrations before applying them. Database setup is an operator action, not part of the application build.

## Admin quote workflow

1. Sign in at `/admin/login`. Search by customer, email, phone, postcode, service or reference; filter by status and sort by date or quote value. Open an enquiry and review the customer's service, property, contact details, preferred date, and message. Correct and save these details while the enquiry is a draft; customer-only updates do not require a priced quote. The saved email address is used for the quote and Revolut checkout.
2. Enter line items with descriptions, quantities, and unit prices in GBP. Choose a fixed GBP discount or a percentage with up to two decimal places. Percentage discounts are stored as integer basis points (100 basis points = 1%) and recalculated from the current subtotal, rounded to the nearest penny. The server derives the discount and payable total; client-supplied totals are rejected and no automatic tariff is applied. A payable quote must total between £1 and £100,000 after discount.
3. Put agreed scope in the customer notes. Keep costs, margins, and staff instructions in **private internal notes**, which are excluded from the client preview and emails. Save the draft before reviewing the client preview.
4. Open **Preview client email** to see the actual branded email rendered from the saved quote, including its recipient, sender, itemised total, discount and client-facing notes. Desktop and mobile preview sizes are available; all preview links are disabled. Confirm the recipient before choosing **Send quote to client**. Previewing creates no payment order and sends no email. Sending saves a Revolut order and payment link before emailing the customer from support. If email fails, use the send action again: it reuses the saved unpaid order rather than creating another link. Reload the latest version if another admin has changed the quote.
5. To revise an issued quote's customer details, scope, or pricing, reopen it first. The old payment order must be cancelled and its cancellation verified before editing is enabled. Processing or paid orders cannot be silently replaced. Save the revised draft, review it, and send its new link. Paid and cancelled quotes remain immutable.

Quote and payment emails leave the cleaning date subject to agreement with the team. Payment does not confirm an unagreed date. A completed payment is recorded as a paid booking after provider verification; customer and internal payment emails are tracked separately so a retry need not resend an already delivered notification.

## Checks and production commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Offline tests cover validation, durable-enquiry failure handling, quote arithmetic, draft/version conflicts, send retries and leases, mail content, and payment verification. Provider calls and storage are mocked; these tests do not establish live delivery, bank settlement, or actual database locking. A build can read published testimonials from the configured database; use the intended environment when building.

On Vercel, import the existing GoodyCleaning repository as its own project, configure its environment variables, deploy it, and attach the GoodyCleaning domains to that project. Configure the production origin before building so metadata and links resolve to the canonical domain.

## Booking and payment behavior

Enquiry mode is the default. Customers submit their name, email, phone, service, and property size to `/api/enquiries`; postcode, preferred date, and message are optional. The endpoint saves a pending admin quote, sends its review link to support, then acknowledges the customer. Customer acknowledgements include a request summary but exclude arbitrary free-text notes. Input validation, request-size and origin checks, a honeypot, and a per-instance burst limit run before persistence. Hosting-level limits can supplement that burst limit across instances. No automatic prices or instant payment form are shown. The instant checkout API rejects submissions while instant booking is disabled.

The legacy `NEXT_PUBLIC_INSTANT_BOOKING_ENABLED=true` path uses the placeholder price table in `src/lib/pricing.ts` for smaller properties. It is separate from manual admin quotes and should remain disabled until an automatic tariff has been approved.

Keep the flag false until the business has approved prices, coverage, and contact details, and the database, correct live Revolut account/key, signed webhook, and production email delivery are ready. The current price table is labelled as placeholder pricing. Do not expose it as a production tariff. Changing this public flag requires rebuilding the application.

Register the production Revolut webhook at:

```text
https://goodycleaning.co.uk/api/webhooks/revolut
```

Subscribe to `ORDER_COMPLETED` and configure the signing secret for this exact Cleaning endpoint. Payments are confirmed by fetching and verifying the provider's completed order against the saved Cleaning quote, amount, currency, and order identity. Visiting the success page alone never confirms a payment. The success page displays the recorded status and stays outside the sitemap with indexing disabled.

For production, configure `DATABASE_URL`, `AUTH_SECRET`, the verified support Gmail credentials, the intended live `REVOLUT_SECRET_KEY`, `REVOLUT_API_URL=https://merchant.revolut.com/api`, and the Cleaning endpoint's `REVOLUT_WEBHOOK_SECRET`. Sandbox and production use separate endpoints and webhook secrets. A generic `sk_` Merchant key must not be assumed to be a sandbox key; set the environment explicitly.

**Shared GoodyVan merchant account:** before enabling live Cleaning payments, verify that GoodyVan's webhook ignores orders belonging to GoodyCleaning and cannot create a Van booking from an unknown order. It must check ownership against its own stored booking/order data before processing payment events. Keep the existing Van endpoint and its secret; register a separate Cleaning endpoint with its own signing secret. Configure and verify this ownership guard in GoodyVan before enabling shared live payments. This repository does not deploy or verify that separate application's configuration.

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
