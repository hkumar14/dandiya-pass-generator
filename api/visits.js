/**
 * Vercel Serverless Function: GET /api/visits
 * Returns recent site visitor records (IP address, timestamp, page)
 */

const { supabase, isConfigured } = require('./supabase-server');
const fs = require('fs');
const path = require('path');

const VISITS_FILE = path.join(process.cwd(), 'visits.json');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Edge cache for rapid response
  res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=15');

  try {
    // 1. Fetch from Supabase if configured
    if (isConfigured && supabase) {
      try {
        const queryPromise = supabase
          .from('site_visits')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase query timeout')), 3000)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        if (!error && Array.isArray(data)) {
          return res.status(200).json(data);
        }
      } catch (err) {
        console.warn('Supabase site_visits fetch fallback to local:', err.message);
      }
    }

    // 2. Fetch from local file fallback
    if (fs.existsSync(VISITS_FILE)) {
      const list = JSON.parse(fs.readFileSync(VISITS_FILE, 'utf-8'));
      return res.status(200).json(list);
    }

    return res.status(200).json([]);
  } catch (err) {
    console.error('Visits API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
