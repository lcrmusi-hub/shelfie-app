# Shelfie

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in your Supabase project URL + anon key
   (Supabase Dashboard → Settings → API)
3. Run `supabase/schema.sql` in Supabase Dashboard → SQL Editor
4. `npm run dev`

## Deploy
Push this folder to a GitHub repo, then connect it on Vercel or Netlify.
Add the same environment variables from `.env` in your host's dashboard
(Project Settings → Environment Variables), then deploy.

## Optional pieces
- Google OAuth: enable in Supabase → Authentication → Providers → Google
- Google Books API key: console.cloud.google.com → enable Books API
- Push notifications: generate VAPID keys with `npx web-push generate-vapid-keys`,
  then see src/lib/pushNotifications.js, public/sw.js, and
  supabase/functions/send-streak-push/index.ts
- Profanity filter word list: fill in src/lib/profanityFilter.js
