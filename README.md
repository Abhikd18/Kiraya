# Kiraya

Broker-free flats, PGs and rooms for rent in Chandigarh Tricity (Chandigarh, Mohali, Panchkula, Zirakpur, Kharar, New Chandigarh).

One Nuxt 4 codebase gives you:

- **Website** with search pages Google can index
- **Web app** for owners to post and manage listings
- **Mobile app** as an installable PWA (Android and iPhone: open the site → "Add to Home screen" / "Install app")

Stack: Nuxt 4 · Nuxt UI 4 · Tailwind 4 · Supabase (database, login, photo storage) · Leaflet + OpenStreetMap maps · Vercel hosting. Everything starts on free plans.

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
2. Go to **SQL Editor → New query**, paste everything from `supabase/schema.sql` and click **Run**.
3. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.
4. Copy `.env.example` to `.env` and fill them in:
   ```
   NUXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NUXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   NUXT_PUBLIC_SITE_URL=http://localhost:3000
   ```
5. **Email login code:** go to **Authentication → Emails → Magic Link** and add `{{ .Token }}` to the email body so users get a 6-digit code (the link in the email also works).
6. **Google login (optional):** go to **Authentication → Sign In / Providers → Google**, turn it on and paste a Client ID and Secret from Google Cloud Console (OAuth client, type "Web application"). Add the redirect URL that Supabase shows you to the Google OAuth client.
7. **Authentication → URL Configuration:** set the Site URL to your live Vercel address, and add `http://localhost:3000/**` and `https://YOUR-SITE.vercel.app/**` to Redirect URLs.
8. Restart `pnpm dev`. The yellow demo banner disappears.

**Free plan notes:** Supabase pauses a free project after about a week with no database activity (open the dashboard to wake it). Free storage is 1 GB, so photos are compressed in the browser before upload.

**Your admin work:** reports from "Report this listing" are in the `reports` table. To give a listing the **Verified** badge, set `verified = true` for that row in **Table Editor → listings**.

## 3. Put it on GitHub

```bash
git init
git add .
git commit -m "Kiraya: first version"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/kiraya.git
git push -u origin main
```

Create an empty repository named `kiraya` on GitHub first (no README, no .gitignore).

## 4. Deploy on Vercel

1. https://vercel.com/new → **Import** the `kiraya` repository. Vercel detects Nuxt automatically.
2. Under **Environment Variables**, add the three `NUXT_PUBLIC_…` values. Set `NUXT_PUBLIC_SITE_URL` to your Vercel address.
3. Click **Deploy**. Every `git push` to `main` deploys again automatically.

**Important:** Vercel's free Hobby plan is for personal, non-commercial use. It's fine while you build and test. Move to Vercel Pro (or another host) before you start charging for anything.

## 5. Mobile app

- **Now (free):** Kiraya is a PWA. On Android Chrome, users get an "Install app" prompt. On iPhone Safari: Share → Add to Home Screen.
- **Play Store later:** paste your live URL into https://www.pwabuilder.com to generate an Android package (Trusted Web Activity) and upload it with a Google Play developer account. Or wrap the site with Capacitor if you need native features such as push notifications.

## Project structure

```
app/
  pages/            index (home), rent (search), property/[id], post (6-step form),
                    login, dashboard (my listings), saved, terms, privacy
  components/       header, mobile tab bar, listing card, filters, map, etc.
  composables/      useSupabase, useAuth, useListings (Supabase or demo mode), useLeaflet
  data/             demo listings
  utils/labels.ts   cities, property types, amenities, formatting helpers
shared/types/       Listing types used everywhere
supabase/schema.sql database tables, security rules and photo storage
public/             PWA manifest, service worker, app icons
```

## Next features (from the blueprint)

- Paid SMS OTP login (MSG91 or Firebase) once you have budget
- In-app chat and visit booking
- Verified owner badge with DigiLocker / eKYC
- Featured listings with Razorpay
- Sector rent guide pages for SEO
