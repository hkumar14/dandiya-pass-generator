/**
 * Vercel Serverless Function: POST /api/register
 * Saves registration to Supabase 'dandiya_registrations' table
 */

const { supabase, isConfigured, LOCAL_DB } = require('./supabase-server');
const fs = require('fs');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const record = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!record || !record.full_name) {
      return res.status(400).json({ error: 'Invalid registration payload: full_name is required' });
    }

    const passId = record.pass_id || ('DN-' + Math.random().toString(36).substring(2, 8).toUpperCase());

    const payload = {
      pass_id: passId,
      full_name: record.full_name,
      year_course: record.year_course,
      phone: record.phone || '',
      email: record.email || '',
      pass_url: record.pass_url || '',
      status: 'Active',
      created_at: record.created_at || new Date().toISOString()
    };

    // 1. Try saving to Supabase if configured
    if (isConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('dandiya_registrations')
          .insert([payload])
          .select();

        if (!error) {
          return res.status(200).json({
            success: true,
            storage: 'supabase',
            message: 'Registration saved to Supabase',
            pass_id: payload.pass_id
          });
        }
        console.warn('Supabase insert warning, falling back to local:', error.message);
      } catch (err) {
        console.warn('Supabase exception, falling back to local:', err.message);
      }
    }

    // 2. Fallback to local storage file
    try {
      let list = [];
      if (fs.existsSync(LOCAL_DB)) {
        list = JSON.parse(fs.readFileSync(LOCAL_DB, 'utf-8'));
      }
      list = list.filter(item => item.pass_id !== payload.pass_id);
      list.unshift(payload);
      fs.writeFileSync(LOCAL_DB, JSON.stringify(list, null, 2));
    } catch (e) {
      console.warn('Local file write error:', e);
    }

    return res.status(200).json({
      success: true,
      storage: 'local',
      message: 'Registration saved locally (Supabase env not configured yet)',
      pass_id: payload.pass_id
    });
  } catch (err) {
    console.error('Registration API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};
