/**
 * Vercel Serverless Function: GET /api/registrations
 * Returns all student registrations (for Admin view & CSV export)
 */

const { supabase, isConfigured, LOCAL_DB } = require('./supabase-server');
const fs = require('fs');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Edge cache: responds in milliseconds via Vercel Edge network
  res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=15');

  try {
    // 1. Fetch from Supabase if configured (with 3.5s timeout protection)
    if (isConfigured && supabase) {
      try {
        const queryPromise = supabase
          .from('dandiya_registrations')
          .select('*')
          .order('created_at', { ascending: false });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase query timeout')), 3500)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        if (!error && data) {
          return res.status(200).json(data);
        }
      } catch (err) {
        console.warn('Supabase query error, fallback to local:', err.message);
      }
    }

    // 2. Fetch from local file fallback
    if (fs.existsSync(LOCAL_DB)) {
      const list = JSON.parse(fs.readFileSync(LOCAL_DB, 'utf-8'));
      return res.status(200).json(list);
    }

    return res.status(200).json([]);
  } catch (err) {
    console.error('Registrations API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
