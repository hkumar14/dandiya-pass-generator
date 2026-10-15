/**
 * Server-side Supabase Client Initialization
 * Used by Vercel Serverless Functions and local server
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
  } catch (err) {
    console.error('Failed to create server Supabase client:', err);
  }
}

// Local JSON fallback file
const LOCAL_DB = path.join(process.cwd(), 'registrations.json');
const LOCAL_ADMINS = path.join(process.cwd(), 'admins.json');

// Initialize local fallback files if needed
if (!fs.existsSync(LOCAL_DB)) {
  try { fs.writeFileSync(LOCAL_DB, JSON.stringify([])); } catch (e) {}
}

const DEFAULT_ADMINS = [
  'kumarprasadhimanshu@gmail.com',
  'hk624234@gmail.com'
];

if (!fs.existsSync(LOCAL_ADMINS)) {
  try { fs.writeFileSync(LOCAL_ADMINS, JSON.stringify(DEFAULT_ADMINS)); } catch (e) {}
}

module.exports = {
  supabase,
  isConfigured: !!(supabaseUrl && supabaseKey && supabase),
  supabaseUrl,
  supabaseKey,
  LOCAL_DB,
  LOCAL_ADMINS,
  DEFAULT_ADMINS
};
