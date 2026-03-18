# Cellaris Inventory — Setup Guide

## Step 1: Create a Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click **New Project**, give it a name (e.g. "cellaris-inventory"), set a password, choose a region
3. Wait ~2 minutes for it to provision

## Step 2: Run the database schema

1. In your Supabase project, go to **SQL Editor**
2. Open the file `lib/database.sql` from this project
3. Paste the entire contents into the SQL editor and click **Run**
4. You should see "Success" with no errors

## Step 3: Get your Supabase keys

In your Supabase project, go to **Settings → API**:
- Copy **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role** key → this is `SUPABASE_SERVICE_ROLE_KEY`

## Step 4: Configure environment variables locally

Edit the file `.env.local` and replace the placeholder values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 5: Enable email auth in Supabase

1. Go to **Authentication → Providers**
2. Make sure **Email** is enabled
3. Go to **Authentication → Email Templates** and customize if desired

## Step 6: Run locally to test

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to /login.

Register a new store, add products, test QR scanning (requires HTTPS for camera — see Step 8 for live demo).

## Step 7: Deploy to Vercel (for live demo with camera/QR)

1. Push this project to a GitHub repository
2. Go to https://vercel.com → **New Project** → Import your repo
3. Add these environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Click **Deploy** — done!

Vercel provides free HTTPS automatically, so QR camera scanning will work on phones.

## Step 8: Set your first super admin

After deploying and registering your account:

1. Go to Supabase → **Table Editor → profiles**
2. Find your user row and change `role` from `manager` to `super_admin`
3. You'll now see the **Admin** button on the store picker screen

## Key URLs after deploy

| Page | URL |
|---|---|
| Login | /login |
| Register store | /register |
| Store picker | /select-store |
| Dashboard | /dashboard |
| Sell | /sell |
| Restock | /restock |
| History | /history |
| Admin | /admin |
