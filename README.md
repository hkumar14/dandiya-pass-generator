# 🪔 Dandiya Night 2026 - Digital Pass Generator & Admin Suite (Vercel + Supabase)

A mobile-first, Vercel-ready web application for **"Dandiya Night 2026"** student registration, entry pass generation, and organizer administration.

---

## 🚀 Live Local Links
- **Public Student Registration & Pass Generator:** [http://localhost:8080](http://localhost:8080)

---

## ⚡ Vercel Deployment Guide

This project is configured with `vercel.json` and serverless functions in `/api/`:

1. **Push to GitHub:**
   Commit this directory to your GitHub account.
2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com) &gt; **Add New Project** &gt; Import your repository.
3. **Set Environment Variables in Vercel:**
   In your Vercel Project Settings &gt; **Environment Variables**, paste:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ADMIN_EMAILS=kumarprasadhimanshu@gmail.com,hk624234@gmail.com
   ```
4. **Click Deploy!** Your application and serverless endpoints (`/api/register`, `/api/registrations`, `/api/admins`, `/api/stats`, `/api/config`) are instantly live.

---

## 🗄️ Supabase Database Setup

Run the following SQL in your **[Supabase Dashboard](https://supabase.com) > SQL Editor**:

```sql
-- 1. Student Registrations Table
CREATE TABLE IF NOT EXISTS dandiya_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pass_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    year_course VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL,
    pass_url TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Admin Users Table
CREATE TABLE IF NOT EXISTS dandiya_admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Pre-seed Primary Admins
INSERT INTO dandiya_admins (email, role) VALUES 
('kumarprasadhimanshu@gmail.com', 'superadmin'),
('hk624234@gmail.com', 'superadmin')
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE dandiya_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dandiya_admins ENABLE ROW LEVEL SECURITY;

-- Security Policies:
CREATE POLICY "Allow public pass registrations" 
ON dandiya_registrations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public pass read for gate entry" 
ON dandiya_registrations FOR SELECT USING (true);

CREATE POLICY "Allow read admin list" 
ON dandiya_admins FOR SELECT USING (true);

CREATE POLICY "Allow insert admin list" 
ON dandiya_admins FOR INSERT WITH CHECK (true);
```

---

## 👑 Admin Features & Authentication

1. **Pre-Authorized Primary Admins:**
   - `kumarprasadhimanshu@gmail.com`
   - `hk624234@gmail.com`
2. **Passwordless Email Verification:**
   - Click the **"Admin"** button at the top of the homepage.
   - Enter your email and click **"Send Verification Link"**.
   - A secure magic link / 6-digit OTP code is sent to your inbox.
   - Enter the code or click the email link to sign in.
3. **Once Logged In, the Top Bar Unlocks:**
   - **Live Registrations Counter:** Shows `🎟️ [Count] Passes` (click to view the full attendance table with search).
   - **Export CSV Button:** One-click download of the complete student registration spreadsheet.
   - **Add Admins (`👥 Admins`):** Easily add more organizers and admin email addresses.
   - **Logout:** Sign out securely.

---

## 📁 Project Architecture
* `vercel.json` - Vercel deployment configuration.
* `.env.example` - Environment variable template for Vercel.
* `api/register.js` - Serverless handler for student registration.
* `api/registrations.js` - Serverless handler for retrieving registrations.
* `api/admins.js` - Serverless handler to list and add admin emails.
* `api/stats.js` - Serverless handler returning live registration counts.
* `api/config.js` - Serverless handler returning client configuration safely.
* `js/admin.js` - Client-side admin auth, OTP verification, and dashboard controls.
* `server.js` - Local Node development server running the Vercel API routes.
