# Hobit backend - Node.js / Express / MySQL

Port of the Laravel backend. Same URLs, request fields, JSON shapes and MySQL tables - the mobile apps and
admin panel should not need changes. Laravel Sanctum tokens already issued keep working (same
`personal_access_tokens` table).

## Setup

```bash
cd hobit-node
npm install
cp .env.example .env      # then fill it in (see below)
npm start                 # or: npm run dev
```

### New database (fresh install)
This project is meant to run on a **brand-new, empty MySQL database** (no Laravel data carried over):

```bash
# in .env set DB_* and, for the first admin: SEED_ADMIN_PHONE, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
npm run db:setup      # creates the DB if missing, all tables, seed data, first super-admin (safe to re-run)
npm run db:fresh      # same, but DROPS every table first - never run against live data
```
`db:setup` seeds: roles (ids fixed: 1 super-admin, 6 co-ordinators are hard-coded in the code), permissions, time slots
(09:00-18:00 every 30 min), neutral settings (all fees 0 - set real values in Admin > Settings), the Monthly Subscription
type (id = `MONTHLY_SUBSCRIPTION_TYPE_ID`, default 4) and the notification-campaign copy library.
Afterwards create cities, zones, service categories and services from the admin panel. Things in the code that expect
specific ids in a fresh catalogue: service **26** = free demo, service **30** (`INSTANT_EXTEND_SERVICE_ID`) = instant extension,
category `INSTANT_CATEGORY_ID` (default 6) = instant help. Create those with matching ids or change the env values.

(If you ever point it at an existing Laravel database instead, the Node app changes no existing table; it only adds
`node_jobs`, created automatically.)

### `.env` values that MUST match the old Laravel `.env`
| Key | Why |
|---|---|
| `DB_HOST/PORT/DATABASE/USERNAME/PASSWORD` | same database |
| `APP_KEY` | worker bank account numbers are encrypted with Laravel `Crypt`; without the same key they cannot be decrypted |
| `APP_URL` | used to build file/asset URLs |
| `CRON_SECRET` | secret for the `/api/cron/*` endpoints (an empty secret makes them return 403) |
| `RAZORPAY_*`, `WHATSAPP_*`, `SMS_*`, `SUREPASS_*`, `WEATHERUNION_*`, `MAIL_*` | copy from the old `.env` |
| `FIREBASE_CREDENTIALS`, `CUSTOMER_FIREBASE_CREDENTIALS` | paths to the service-account JSON files |

Copy uploaded files from Laravel's `storage/app/public` into `hobit-node/storage/app/public` and from
`public/uploads` into `hobit-node/public/uploads` so existing image URLs keep working.

## Layout
- `src/modules/<domain>/` controllers + routes (`*.routes.js` mounted at `/api`, `*.web.routes.js` at `/`)
- `src/models/` Sequelize models (one per Eloquent model; relation aliases = Eloquent relation names)
- `src/services/`, `src/helpers/` ports of `app/Services`, `app/Helpers`
- `src/jobs/` queue handlers + `scheduler.js` (replaces `routes/console.php`); `src/commands/` artisan commands
- `src/utils/`, `src/middleware/` shared infrastructure (validator, paginator, auth, throttles, uploads)
- `CONVENTIONS.md` rules used for the conversion

Background work: `RUN_SCHEDULER=true` (default) runs the cron schedule and job worker inside the web process.
Run only ONE instance with the scheduler on, or set `RUN_SCHEDULER=false` on extra instances.

## Verified (local MySQL/MariaDB, Razorpay + WhatsApp + Firebase replaced by fakes)
- All models load together; ~500 routes registered (every Laravel API + web route).
- `npm run db:setup` builds a complete database from scratch (90 tables + seed data) and is re-runnable.
- Every GET route called as admin / customer / worker, and every write route with empty + sample bodies: no unexpected 500s.
- Full booking lifecycle: create -> pay (order/verify/webhook, coupons) -> assign -> start OTP -> close OTP -> invoice PDF -> WhatsApp send.
- Instant extension (order/verify/replay), cancellation request + admin approval, subscription pause/resume/reschedule/cancel with refund.
- Workers: registration, KYC + photo uploads, attendance (geofence), withdrawals, encrypted bank details, commissions.
- Customer OTP login + rate limit, coupons, addresses, ratings, surveys, enquiries, live tracking, exports, scheduler jobs.
- Access rules (anonymous -> 401, wrong role -> 403, public routes still public) and production-mode behaviour: 71 automated checks.

## NOT verified - needs your real credentials / servers
The third-party services were replaced by fakes in testing, so the code paths run but the real services were never called:
1. **Razorpay** live orders/verify/refunds/payment links and the real webhook signature (raw body).
2. **WhatsApp Cloud API, SMS gateway, mail** delivery and templates.
3. **Firebase push** and the live-tracking realtime database.
4. **Surepass Aadhaar KYC** and the **weather** API.
5. The mobile apps / admin panel against this API (they must send the login token on the endpoints listed above).
6. Behaviour under real traffic (load, rate limits behind a proxy - `trust proxy` is already enabled for nginx).

## Response differences vs Laravel
- Decimal columns return numbers (`100`), Laravel returned strings (`"100.00"`) for `decimal:2` casts.
- Some `date`-cast columns return `YYYY-MM-DD` instead of a full ISO timestamp.
- Invoice / export PDFs are drawn with pdfkit; layout is close to, not identical to, the Blade/dompdf output.
- Blade pages (rating, OTP verify, instant extend, live tracking) are plain HTML strings; no CSRF/session.

## Bugs fixed compared with the Laravel app
The Laravel app had these problems; they are fixed here (the port is otherwise behaviour-for-behaviour):
- **No authentication on admin/sensitive routes.** `src/middleware/routeGuards.js` now protects them (one rule table, easy to audit):
  `POST /register` (anyone could create a super-admin) needs super-admin/city-admin (only a super-admin may create admin accounts);
  catalog / CMS / banners / coupons / cities / zones / areas / pincodes / events **writes** need an admin role;
  `PATCH /bookings/:id/status`, `GET /dashboard/counts`, enquiries + survey lists, bank details by id need admin;
  booking OTP / end-service / payment-link / invoice / worker-location endpoints need a login;
  `/api/bot/*` and `/api/whatsapp/send*` need `BOT_API_KEY`; `/api/cron/*` need `CRON_SECRET`.
  Public app reads (catalog, CMS, banners, time slots ...), login/OTP, public forms and signed webhooks stay open.
- **Hard-coded review logins** (customer 9999999999 / worker 8888888888, OTP 123456) are OFF in production unless
  `STATIC_LOGIN_ENABLED=true`, and can never log in as a non-customer / non-worker account.
- Worker self-registration (`/worker/register_app`) can no longer set `is_active` (stays inactive until KYC is approved).
- `POST /bookings/:id/send-invoice`: removed the leftover `dd()`; it now sends the invoice. Invoice links under
  `/storage/app/public/*` and `/public/storage/*` (the shape WhatsApp messages use) now resolve.
- Payment link keeps the paise (amount is converted to paise exactly once).
- Firebase push is best-effort: missing credentials no longer turn assign-booking / OTP verify / tracking into 500s.
- Routes whose controller method never existed: `GET /admin/customers|workers|commissions/:id`, `GET /subscription-types|extra-time-fees/:id`
  are implemented; `DELETE /admin/customers|workers/:id` do a recoverable soft delete; `POST /worker/login/password` is implemented;
  the dead `POST /customer/login-password`, public `GET /referrals/all` and the `/test-*` debug routes are removed.
- Database errors are friendly: duplicate value -> 422, deleting a record that is in use -> 409, bad reference -> 422 (were 500s).
- `POST /ratings` without `description`, `POST /alerts/mark-read` without ids, CMS workings update without cards and a
  withdrawal above the wallet balance no longer return 500 (422 / success as appropriate).
- Startup warns about a wrong-length `APP_KEY`, empty `CRON_SECRET`, empty `BOT_API_KEY`, active static logins (production).

## Still worth knowing
- `APP_KEY` must be exactly 32 bytes (or `base64:` + 32 bytes) - it encrypts worker bank details.
- Customers created by an admin (`admin-users/customer.controller`) get the default password `123456` (as in Laravel).
- `GET /api/track/:booking_id/latest` and `/track/map_data/:booking_id` stay public (customer tracking links) - booking ids are guessable.
- `SurepassService` disables TLS certificate verification (as the PHP did).
- `/api/admin/assign-booking` was registered twice in Laravel; only the first registration is active.

## Not ported (no route / dead code in PHP)
`AgentWorkerController`, `UserReferralController`, `Booking/BookingAssignmentController`, commented-out Aadhaar KYC routes
(controller ported, routes left commented), `*_old` / `_baK` backup controllers, `Mail`/`dd` test routes beyond `/api/test-*`.
