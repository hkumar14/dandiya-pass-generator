/**
 * Vercel Serverless Function: GET /api/stats
 * Returns live count of registrations
 */

const { supabase, isConfigured, LOCAL_DB } = require('./supabase-server');
const fs = require('fs');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Edge cache for instant stats badge updates
  res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=15');

  try {
    if (isConfigured && supabase) {
      try {
        const countPromise = supabase
          .from('dandiya_registrations')
          .select('*', { count: 'exact', head: true });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Supabase count timeout')), 3500)
        );

        const { count, error } = await Promise.race([countPromise, timeoutPromise]);

        if (!error && count !== null) {
          return res.status(200).json({ count });
        }
      } catch (e) {
        console.warn('Supabase count error:', e.message);
      }
    }

    if (fs.existsSync(LOCAL_DB)) {
      const list = JSON.parse(fs.readFileSync(LOCAL_DB, 'utf-8'));
      return res.status(200).json({ count: list.length });
    }

    return res.status(200).json({ count: 0 });
  } catch (err) {
    return res.status(500).json({ count: 0, error: err.message });
  }
};
