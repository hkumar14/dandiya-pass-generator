/**
 * Vercel Serverless Function: POST /api/admin-login
 * Records admin login timestamps and IP addresses into Supabase 'admin_logins' table.
 * Private backend tracking only — no IP or logs displayed in public area.
 */

const { supabase, isConfigured, DEFAULT_ADMINS } = require('./supabase-server');

const SUPER_ADMIN_EMAIL = 'kumarprasadhimanshu@gmail.com';

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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const email = (body.email || '').toLowerCase().trim();

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    // 1. Capture Client IP
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = forwarded
      ? forwarded.split(',')[0].trim()
      : req.headers['x-real-ip'] || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';

    // 2. Timestamp & Metadata
    const timestamp = new Date().toISOString();
    const userAgent = req.headers['user-agent'] || '';
    const isSuperAdmin = (email === SUPER_ADMIN_EMAIL);
    const role = isSuperAdmin ? 'superadmin' : 'admin';

    // 3. Log to Vercel Runtime Console (always indexed securely in Vercel Observability)
    console.log(`[ADMIN_LOGIN] Email: ${email} | Role: ${role} | IP: ${clientIp} | Time: ${timestamp}`);

    // 4. Save into Supabase 'admin_logins' table if configured
    let savedToSupabase = false;
    if (isConfigured && supabase) {
      try {
        const loginRecord = {
          email: email,
          ip_address: clientIp,
          role: role,
          user_agent: userAgent,
          created_at: timestamp
        };

        const { error } = await supabase
          .from('admin_logins')
          .insert([loginRecord]);

        if (!error) {
          savedToSupabase = true;
        } else {
          console.warn('Supabase admin_logins insert note:', error.message);
        }
      } catch (err) {
        console.warn('Supabase admin_logins exception:', err.message);
      }
    }

    // Return clean response with no sensitive data leaked to public client
    return res.status(200).json({
      ok: true,
      logged: true,
      supabase: savedToSupabase
    });
  } catch (err) {
    console.error('Admin login tracking error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
