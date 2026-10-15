/**
 * Vercel Serverless Function: /api/admins
 * Handles listing and adding authorized admin email addresses
 */

const { supabase, isConfigured, LOCAL_ADMINS, DEFAULT_ADMINS } = require('./supabase-server');
const fs = require('fs');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // GET: Fetch list of authorized admins
  if (req.method === 'GET') {
    try {
      const adminSet = new Set(DEFAULT_ADMINS.map(e => e.toLowerCase()));

      // Check environment variable ADMIN_EMAILS
      if (process.env.ADMIN_EMAILS) {
        process.env.ADMIN_EMAILS.split(',').forEach(e => {
          if (e.trim()) adminSet.add(e.trim().toLowerCase());
        });
      }

      // Check Supabase 'dandiya_admins' table
      if (isConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('dandiya_admins')
            .select('email');

          if (!error && data) {
            data.forEach(row => {
              if (row.email) adminSet.add(row.email.toLowerCase().trim());
            });
          }
        } catch (e) {
          console.warn('Supabase admin fetch error:', e.message);
        }
      }

      // Check local fallback file
      try {
        if (fs.existsSync(LOCAL_ADMINS)) {
          const localList = JSON.parse(fs.readFileSync(LOCAL_ADMINS, 'utf-8'));
          localList.forEach(e => adminSet.add(e.toLowerCase().trim()));
        }
      } catch (e) {}

      return res.status(200).json({
        admins: Array.from(adminSet)
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve admins' });
    }
  }

  // POST: Add a new admin email ID
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const newEmail = (body.email || '').toLowerCase().trim();

      if (!newEmail || !newEmail.includes('@')) {
        return res.status(400).json({ error: 'Valid email address is required' });
      }

      // 1. Save to Supabase if configured
      if (isConfigured && supabase) {
        try {
          await supabase
            .from('dandiya_admins')
            .upsert([{ email: newEmail, created_at: new Date().toISOString() }], { onConflict: 'email' });
        } catch (e) {
          console.warn('Supabase add admin error:', e.message);
        }
      }

      // 2. Save to local fallback file
      let localList = [...DEFAULT_ADMINS];
      try {
        if (fs.existsSync(LOCAL_ADMINS)) {
          localList = JSON.parse(fs.readFileSync(LOCAL_ADMINS, 'utf-8'));
        }
      } catch (e) {}

      if (!localList.includes(newEmail)) {
        localList.push(newEmail);
        try {
          fs.writeFileSync(LOCAL_ADMINS, JSON.stringify(localList, null, 2));
        } catch (e) {}
      }

      return res.status(200).json({
        success: true,
        message: `Admin ${newEmail} added successfully!`,
        email: newEmail
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to add admin', message: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
