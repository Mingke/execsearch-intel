
# ExecSearch Intel - AI Analyst

**Copyright © 2025 MRS.ai. All rights reserved.**

## 1. Project Overview

The **ExecSearch Intel** tool automates the analysis of unstructured web content to identify high-value recruitment signals for Executive Search Professionals. 

It utilizes a modern **Serverless Architecture**:
*   **Frontend**: React + Vite (Hosted on Vercel)
*   **Backend**: Supabase Edge Functions (Hosted on Supabase)
*   **Database**: Supabase PostgreSQL (for user quotas)
*   **AI**: Google Gemini 2.5 Flash

## 2. Architecture & Security Flow

1.  **User Login**: Users authenticate via Google Sign-In (Supabase Auth).
2.  **Request**: Frontend sends text to Supabase Edge Function (`analyze-content`).
3.  **Verification**: Edge Function verifies the User Session token.
4.  **Quota Check**: Edge Function checks the `profiles` database table (`usage_count < usage_limit`).
5.  **AI Analysis**: Edge Function securely calls Google Gemini API (Key is hidden in server secrets).
6.  **Accounting**: Edge Function increments the user's `usage_count` in the database.
7.  **Response**: Frontend receives the analysis result.

---

## 3. Database Setup (Required)

To initialize the quota system, run the following SQL in your **Supabase SQL Editor**:

```sql
-- 1. Create profiles table
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  usage_count integer default 0,
  usage_limit integer default 10, -- Default Free Tier limit
  role text default 'user',
  primary key (id)
);

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Allow users to view their own quota
create policy "Users can view own profile" 
  on public.profiles for select 
  using ( auth.uid() = id );

-- 3. Automatic Profile Creation Trigger
-- This ensures every new user gets a profile with 10 credits automatically.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, usage_count, usage_limit, role)
  values (new.id, new.email, 0, 10, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## 4. Admin Privileges Setup (Required for Dashboard)

To make the Admin Dashboard work (so you can see/reset other users), run this SQL:

```sql
-- 1. Helper function to check if user is admin
create or replace function public.is_admin()
returns boolean language sql security definer stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 2. Allow Admins to view ALL profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using ( is_admin() );

-- 3. Allow Admins to update ALL profiles (for resetting quota)
create policy "Admins can update all profiles"
  on public.profiles for update
  using ( is_admin() );
```

> **IMPORTANT**: After running this, manually update your own user row in the `profiles` table to set `role` = `'admin'`.

---

## 5. Environment Configuration

### A. Vercel (Frontend)
Set these in your Vercel Project Settings > Environment Variables:

*   `VITE_SUPABASE_URL`: Your Supabase Project URL (e.g., `https://xyz.supabase.co`).
*   `VITE_SUPABASE_ANON_KEY`: Your Supabase Public Anon Key.

### B. Supabase (Backend Secrets)
Set these in Supabase Dashboard > Project Settings > Edge Functions > Secrets:

*   `GOOGLE_API_KEY`: Your Google Gemini API Key (`AIza...`).

### C. Supabase Auth Redirects (Critical)
To prevent the app from redirecting to `localhost:3000` after login, you must configure the whitelist:

1.  Go to Supabase Dashboard > **Authentication** > **URL Configuration**.
2.  Set **Site URL** to your Vercel production URL (e.g., `https://my-app.vercel.app`).
3.  Add the following to **Redirect URLs**:
    *   `https://my-app.vercel.app` (Your Production URL)
    *   `http://localhost:5173` (Your Local Dev URL)
4.  Click **Save**.

---

## 6. Deployment Guide

### Deploying the Backend (Edge Function)
You must deploy the server-side logic for the app to function.

1.  **Install Supabase CLI**:
    ```bash
    npm install -g supabase
    ```
2.  **Login to Supabase**:
    ```bash
    npx supabase login
    ```
3.  **Deploy the Function**:
    Run this command from the project root:
    ```bash
    npx supabase functions deploy analyze-content
    ```

### Admin Management (Reset Quota)
You can manage users via the **Admin Dashboard** in the app (if you set your role to 'admin'), or manually via the Supabase Dashboard:
1.  Go to **Table Editor** > **profiles**.
2.  Filter by email to find the user.
3.  Manually set `usage_count` to `0` to reset their limit.

---

## 7. Troubleshooting

**Error: "User profile not found"**
*   **Cause**: The user logged in BEFORE the Database Trigger was created.
*   **Fix**: Go to Supabase > Authentication, delete the user, and ask them to sign up again. Or manually insert a row into the `profiles` table with their User UUID.

**Error: "Quota Exceeded"**
*   **Cause**: User has reached their `usage_limit`.
*   **Fix**: See "Admin Management" above to reset their count.
