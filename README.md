# Kiraya

Broker-free flats, PGs and rooms for rent in Chandigarh Tricity (Chandigarh, Mohali, Panchkula, Zirakpur, Kharar, New Chandigarh).

One Nuxt 4 codebase gives you:

- **Website** with search pages Google can index
- **Web app** for owners to post and manage listings
- **Mobile app** as an installable PWA (Android and iPhone: open the site → "Add to Home screen" / "Install app")

Stack: Nuxt 4 · Nuxt UI 4 · Tailwind 4 · Supabase (database, login, photo storage) · Leaflet + OpenStreetMap maps · Vercel hosting. Everything starts on free plans.

- **Live site:** https://www.kiraya.live (`kiraya.live` redirects there; the old https://kiraya-one.vercel.app still works)
- **Code:** https://github.com/Abhikd18/Kiraya (every push to `main` redeploys on Vercel)
- **My profile:** `/profile` (see section 6) · **Owner and broker dashboard:** `/dashboard` (see section 6b)
- **Super admin dashboard:** `/admin` (see section 7)

---

## 1. Run it on your computer

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

Without Supabase keys, Kiraya runs in **demo mode**: 12 sample Tricity listings, a name-only demo login, and new listings saved in your browser. Use it to try every screen.

## 2. Connect Supabase (real database and login), about 5 minutes

1. Create a free project at https://supabase.com (choose the **Mumbai** region).
2. Go to **SQL Editor → New query**, paste everything from `supabase/schema.sql` and click **Run**. The file is safe to run again whenever it changes; it never deletes your data.
3. Go to **Project Settings → API Keys** and copy the **Project URL** and the **Publishable key** (`sb_publishable_…`, or the legacy **anon public** key `eyJ…`). Never use the secret / `service_role` key in the app.
4. Copy `.env.example` to `.env` and fill them in:
   ```
   NUXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NUXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   NUXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
5. **Authentication → URL Configuration:** set the Site URL to `https://www.kiraya.live`, and add `https://www.kiraya.live/**`, `https://kiraya.live/**`, `https://kiraya-one.vercel.app/**` and `http://localhost:3000/**` to Redirect URLs.
6. Restart `pnpm dev`. The yellow demo banner disappears.

### Email login

Users type their email and get a **"Sign in" link**. The link works once, in any browser or phone, and each new email cancels the older ones. If a link is expired or already used, the app shows a clear message and asks for a new one.

- **Free email limit:** Supabase's built-in email sends only about **2 login emails per hour** for the whole project. That's fine for testing, but not for real users.
- **Before launch, connect your own email service** in **Authentication → Emails → SMTP Settings**. This removes the 2-per-hour limit and unlocks the email templates.

#### Email with Resend (free: 3,000 emails/month, 100/day)

Resend only sends to other people from a **domain you own** (e.g. `kiraya.in`). Without a domain it can only send to your own Resend account email.

1. Sign up at https://resend.com → **Domains → Add domain** → enter your domain (region: Tokyo or Singapore is closest to India).
2. Add the DNS records Resend shows (MX, TXT for SPF/DKIM) at your domain registrar, then click **Verify** (usually minutes, can take a few hours).
3. **API Keys → Create API key** (permission: **Sending access**, domain: yours). Copy it once; Resend never shows it again. Never put it in the app or `.env`.
4. Supabase → **Authentication → Emails → SMTP Settings** → turn on **Enable custom SMTP**:
   - Sender email: `login@your-domain` · Sender name: `Kiraya`
   - Host: `smtp.resend.com` · Port: `465` · Username: `resend` · Password: the API key
5. **Authentication → Rate Limits:** raise **Rate limit for sending emails** (e.g. 30 per hour).
6. **Authentication → Emails → Templates → Magic Link:** add the 6-digit code to the body, for example `<p>Your Kiraya login code: <strong>{{ .Token }}</strong></p>`. The login page already has a code box.

### Password login

Any logged-in user can set a password in **My profile → Password** (at least 8 characters, letters and numbers) and then use **Log in with email and password** on the login page. There's no separate "forgot password" email: users log in with Google or an email link and set a new password in My profile. This needs the **Email** provider switched on in **Authentication → Sign In / Providers** (it is by default).

### Google login (optional, recommended)

Go to **Authentication → Sign In / Providers → Google**, turn it on and paste a Client ID and Secret from Google Cloud Console (OAuth client, type "Web application"). Add the redirect URL that Supabase shows you to the Google OAuth client. Google login has no email limits.

**Free plan notes:** Supabase pauses a free project after about a week with no database activity (open the dashboard to wake it). Free storage is 1 GB, so photos are compressed in the browser before upload.

**Privacy built into the database:** the "House no. / full address" field is never readable from the app, and owner phone numbers are only shown to logged-in users.

## 3. GitHub

The code is at https://github.com/Abhikd18/Kiraya. To publish changes:

```bash
git add .
git commit -m "Describe the change"
git push
```

`.env` is in `.gitignore` and is never committed.

## 4. Vercel

The project `kiraya` on the `abhikd18` Hobby account is connected to the GitHub repo, so every `git push` to `main` deploys https://www.kiraya.live automatically (about 1 minute).

**Domain:** `kiraya.live` was bought at Hostinger. Its DNS stays at Hostinger (**hPanel → Domains → kiraya.live → DNS / Nameservers**) with two records: **A** `@` → `216.198.79.1` and **CNAME** `www` → `15a9393fc3974aed.vercel-dns-017.com` (values from Vercel → kiraya → Settings → Domains). Vercel redirects `kiraya.live` to `www.kiraya.live` and renews the HTTPS certificate automatically.

The three `NUXT_PUBLIC_…` values are set in **Vercel → kiraya → Settings → Environment Variables** (`NUXT_PUBLIC_SITE_URL` = `https://www.kiraya.live` for Production). If you change one there, redeploy (**Deployments → ⋯ → Redeploy**) for it to take effect.

**Important:** Vercel's free Hobby plan is for personal, non-commercial use. It's fine while you build and test. Move to Vercel Pro (or another host) before you start charging for anything.

## 5. Mobile app

- **Now (free):** Kiraya is a PWA. On Android Chrome, users get an "Install app" prompt. On iPhone Safari: Share → Add to Home Screen.
- **Play Store later:** paste your live URL into https://www.pwabuilder.com to generate an Android package (Trusted Web Activity) and upload it with a Google Play developer account. Or wrap the site with Capacitor if you need native features such as push notifications.

## 6. My profile (`/profile`)

Every logged-in user can set or change their **password** and edit their **name**, **mobile number** (filled in automatically when they post), **I am a…** (Tenant, Student, Owner or Broker / agent) and **city**. Open it by clicking your name in the header or **My profile** on the dashboard; it also has **Log out**. Users whose role is Broker get "Broker / agent" pre-selected when posting. The login email can't be changed there, and users can't unblock themselves (the database prevents it). Admins see each user's role, city and phone in **Admin → Users** and can filter by role.

## 6b. Owner and broker dashboard (`/dashboard`)

Owners and brokers use the same account type; when posting, they choose **Owner** or **Broker / agent**, and broker listings show a "Broker" label. In **My listings** each listing has:

- **Edit:** opens the same 6-step form filled in with the listing. Change anything (type, location and map pin, details, rent, photos, phone), jump between steps at the top, then tap **Save changes** on the last step. The "House no. / full address" box starts empty because it's stored privately; leave it empty to keep the saved address. Editing doesn't change the status or the 30-day expiry.
- **Mark as rented**, **Pause**, **Make live (30 days)** and **Delete**.

An **Edit listing** button also appears on the property page for its owner (and for admins).

## 7. Super admin dashboard (`/admin`)

Super admins manage everything from one page. Everyone else is refused by the database itself, not just hidden in the app.

**Make someone a super admin** (they must have logged in once). In Supabase **SQL Editor**, run:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'their@email.com';
```

To remove an admin: `delete from public.admins where user_id = (select id from auth.users where email = 'their@email.com');`

Admins see an **Admin** link in the header and an **Admin panel** button on their dashboard.

| Tab | What you can do |
|---|---|
| **Overview** | Counts of live, paused, rented and expired listings, users, open reports and unverified listings. Tap a count to open that list. |
| **Listings** | Every listing in any status, with search and filters. **Edit** any listing, **Publish** (live for 30 days), **Pause** (hidden from search), **Mark rented**, **Verify / Remove verified** (the green badge), **Delete**. |
| **Users** | Every account (tenants, students and owners all use the same kind of account). **Block** stops the user from posting and pauses their live listings; **Unblock** lets them post again. **Listings** shows that user's listings. |
| **Reports** | Reports sent with "Report this listing". **Pause listing**, **Resolved**, **Dismiss**. |

Deleting an account completely is done in Supabase: **Authentication → Users** (this also deletes their listings).

## Project structure

```
app/
  pages/            index (home), rent (search), property/[id], post (6-step form, also edits), profile,
                    login, dashboard (my listings), admin (super admin), saved, terms, privacy
  components/       header, mobile tab bar, listing card, filters, map, etc.
  composables/      useSupabase, useAuth, useListings (Supabase or demo mode), useAdmin, useLeaflet
  data/             demo listings
  utils/labels.ts   cities, property types, amenities, formatting helpers
shared/types/       Listing types used everywhere
supabase/schema.sql database tables, security rules, admins and photo storage
public/             PWA manifest, service worker, app icons
```

## Next features (from the blueprint)

- Paid SMS OTP login (MSG91 or Firebase) once you have budget
- In-app chat and visit booking
- Verified owner badge with DigiLocker / eKYC
- Featured listings with Razorpay
- Sector rent guide pages for SEO
