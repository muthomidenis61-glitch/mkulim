# MKULIMA genuine subscription setup

The code in this change adds account registration/login, a server-timed one-use 72-hour Discovery Pass, M-Pesa STK Push initiation, a Safaricom STK query check, and subscription entitlements stored in Supabase. It deliberately fails closed until provider configuration is complete.

## 1. Supabase
1. Create/open the project in the official Supabase dashboard.
2. In SQL Editor, run the complete, latest file `supabase/mkulima-subscriptions.sql`. **This is required after the latest code change** because the M-Pesa callback now calls the database function `public.finalize_mkulima_payment(...)`. If you ran an older version of this SQL previously, run the entire updated file again; it uses `create or replace function` for the new function.
3. In Authentication settings, configure email confirmation and the production site URL/redirect URLs. For a first test, use a test account you control.
4. Copy the project URL and publishable/anon key from the project API settings. The service-role key must stay private.

## 2. Netlify environment variables
In the MKULIMA Netlify site's environment variables, set these for Functions (Production and Deploy Previews as appropriate):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secret; server only)
- `SITE_URL=https://mkulim.netlify.app`
- `DARAJA_ENV=sandbox` while testing
- `DARAJA_CONSUMER_KEY` (secret)
- `DARAJA_CONSUMER_SECRET` (secret)
- `DARAJA_SHORTCODE` (must be the shortcode enabled for STK Push on the Daraja application)
- `DARAJA_PASSKEY` (secret supplied for that shortcode)
- `DARAJA_CALLBACK_URL=https://mkulim.netlify.app/.netlify/functions/mpesa-callback`

Never paste these secrets into ChatGPT, source code, GitHub issues, or a public repository. Add/update them only in Netlify's protected environment settings. The listed PayBill number on the existing instructions page is not automatically guaranteed to be an STK-enabled shortcode: confirm with Safaricom/Daraja that the business shortcode and passkey belong to the legitimate payee.

## 3. Safe test sequence
1. Keep `DARAJA_ENV=sandbox` and use Safaricom's sandbox test credentials and test numbers.
2. Deploy the functions after setting the Supabase schema and required variables.
3. Register a test user, confirm email if required, and sign in at `/subscription.html`.
4. Start a Discovery Pass; verify a single row in `mkulima_trials`, then try again and confirm the original expiry is returned.
5. Start a sandbox STK request; verify pending payment is not active. Exercise successful, cancelled, wrong-amount and duplicate callback cases. A subscription is granted only after the server-side STK query and amount/phone/receipt checks pass and the SQL finalisation function completes.
6. Only after end-to-end sandbox tests and payee ownership confirmation, switch Daraja to production and set production credentials. Do not collect a user's M-Pesa PIN on MKULIMA.

## Current billing rules
- Weekly: KSh 300 for 7 days.
- Monthly: KSh 1,050 for 30 days.
- Payments are one-time; there is no automatic recurring charge. Users must renew manually.
- Cancellation, refunds, customer support process, terms and privacy notices should be finalised before public paid launch.
- The backend records paid entitlements, but it does not yet gate every tool in the main static dashboard. Add server-authorised API checks to any premium-only operation before representing feature restrictions as enforced.

## Endpoints
- `/.netlify/functions/auth-register`
- `/.netlify/functions/auth-login`
- `/.netlify/functions/subscription-trial`
- `/.netlify/functions/subscription-status`
- `/.netlify/functions/mpesa-stk-push`
- `/.netlify/functions/mpesa-callback`

Without the environment variables, Supabase SQL setup (including `finalize_mkulima_payment`), and valid Daraja credentials, the UI reports setup is incomplete; it must not claim a payment or paid plan is active. A successful GitHub Actions check validates code structure and syntax, but does not run live M-Pesa payments or apply SQL to your Supabase project.
