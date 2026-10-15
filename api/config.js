/**
 * Vercel Serverless Function: GET /api/config
 * Provides public Supabase URL & Anon Key for client-side Auth (safe for public)
 */

require('dotenv').config();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  return res.status(200).json({
    isConfigured: !!(supabaseUrl && supabaseAnonKey),
    supabaseUrl,
    supabaseAnonKey,
    defaultAdmins: [
      'kumarprasadhimanshu@gmail.com',
      'hk624234@gmail.com'
    ]
  });
};
