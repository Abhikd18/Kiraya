You are working on **Kiraya**, a Nuxt 4 rental website + installable PWA for Chandigarh Tricity (tenants find flats/PGs/rooms, owners post for free). The code is already written in this folder. Read `README.md` first, then do the steps below in order. Stop and ask me before anything that costs money or needs my passwords.

**Stack (do not change):** Nuxt 4 (`app/` folder), Nuxt UI 4, Tailwind 4, pnpm, Supabase (`@supabase/supabase-js`), Leaflet + OpenStreetMap loaded from CDN, Vercel hosting. Without Supabase keys the app runs in demo mode (`app/data/demo-listings.ts` + localStorage). Keep demo mode working.

### Step 1 – Install and run
1. Run `pnpm install`, then `pnpm dev`.
2. The code was written without being run, so fix any install, build, TypeScript or Vue compile errors. Keep fixes small and don't redesign anything.
3. Run `pnpm build` and make sure it finishes with no errors.

### Step 2 – Test every screen in the browser (demo mode)
Open http://localhost:3000 and check each of these, on desktop width and on mobile width (375px):
- `/` home: hero search, popular-search chips, "Fresh listings" cards, city cards
- `/rent`: every filter, sort, list/map toggle (map shows ₹ price pins), URL query updates
- `/property/demo-1` and `/property/demo-2` (PG): gallery placeholder, facts, map, "Log in to contact owner", save, share, report
- `/login`: demo login with a name
- `/post`: all 6 steps, drop a pin on the map, add 2 photos, submit → redirects to the new property page
- `/dashboard`: the new listing shows; mark rented / pause / make live / delete all work
- `/saved`, `/terms`, `/privacy`, a wrong URL (404 page)
- Bottom tab bar shows on mobile only; dark mode is readable

Fix every bug, console error and Vue hydration warning you find. Give me a short list of what you fixed.

### Step 3 – Git and GitHub
1. `git init`, commit everything with the message "Kiraya: first version". Make sure `.env` and `node_modules` are not committed.
2. If the GitHub CLI (`gh`) is installed and logged in, create a **public** repo named `kiraya` and push to `main`. If not, tell me the exact commands and I'll create the repo on github.com.

### Step 4 – Deploy to Vercel
1. If the Vercel CLI is available (`npx vercel`), deploy the project to production on my **free Hobby** account (I'll log in when asked). Otherwise, tell me to import the GitHub repo at vercel.com/new.
2. Give me the live URL and check that the home page, `/rent` and a property page load there.

### Step 5 – Supabase (I'll create the project, then you help)
I'll create a free Supabase project (Mumbai region) and give you the Project URL and anon key. Then:
1. Tell me to paste `supabase/schema.sql` into Supabase **SQL Editor** and run it. Or run it yourself if the Supabase CLI is set up.
2. Create `.env` from `.env.example` with my keys and restart `pnpm dev`. The yellow "Demo mode" banner should disappear.
3. Test the real flow: email-code login → post a property with photos → it appears in `/rent` → logged-in user can see the phone number.
4. Add the same three `NUXT_PUBLIC_…` variables in Vercel (Project → Settings → Environment Variables) and redeploy.
5. Remind me to set Supabase **Authentication → URL Configuration** (Site URL = my Vercel URL; redirect URLs `http://localhost:3000/**` and `https://<my-site>.vercel.app/**`) and to add `{{ .Token }}` to the Magic Link email template.

### Rules
- Keep all secrets in `.env` and never commit them. Only the anon key is used in the browser; never use the service_role key in the app.
- Free plans only for now. Vercel Hobby is for non-commercial use, so warn me before adding any paid feature.
- When everything works, update `README.md` with anything that changed and give me a summary: what works, the live URL, and anything I still need to do.
