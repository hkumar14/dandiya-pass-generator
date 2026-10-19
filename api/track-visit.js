/**
 * Vercel Serverless Function: POST /api/track-visit
 * Captures visitor IP address, timestamp, page URL, and logs to Supabase and Vercel
 */

const { supabase, isConfigured } = require('./supabase-server');
const fs = require('fs');
const path = require('path');

const VISITS_FILE = path.join(process.cwd(), 'visits.json');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // 1. Extract accurate User IP Address from Vercel / Proxy headers
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded
      ? forwarded.split(',')[0].trim()
      : req.headers['x-real-ip'] || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';

    // 2. Capture precise timestamp
    const timestamp = new Date().toISOString();

    // 3. Extract request body/query metadata
    let body = {};
    if (req.body) {
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch (e) {
        body = {};
      }
    }

    const page = body.page || req.query?.page || '/';
    const userAgent = req.headers['user-agent'] || body.userAgent || 'unknown';
    const referrer = req.headers['referer'] || body.referrer || '';
    const screen = body.screen || '';

    const visitRecord = {
      ip_address: ip,
      page: page,
      user_agent: userAgent,
      referrer: referrer,
      screen_resolution: screen,
      created_at: timestamp
    };

    // 4. Log to Vercel Runtime Console (Vercel automatically stores & indexes these logs in Vercel Observability)
    console.log(`[SITE_VISIT] IP: ${ip} | Time: ${timestamp} | Page: ${page} | Referrer: ${referrer}`);

    // 5. Store in Supabase 'site_visits' table if configured
    let savedToSupabase = false;
    if (isConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('site_visits')
          .insert([visitRecord]);

        if (!error) {
          savedToSupabase = true;
        } else {
          console.warn('Supabase site_visits insert note:', error.message);
        }
      } catch (err) {
        console.warn('Supabase site_visits exception:', err.message);
      }
    }

    // 6. Local / Vercel fallback storage in visits.json
    try {
      let list = [];
      if (fs.existsSync(VISITS_FILE)) {
        list = JSON.parse(fs.readFileSync(VISITS_FILE, 'utf-8'));
      }
      list.unshift(visitRecord);
      if (list.length > 1000) list = list.slice(0, 1000); // keep recent 1000 visits
      fs.writeFileSync(VISITS_FILE, JSON.stringify(list, null, 2));
    } catch (e) {}

    return res.status(200).json({
      success: true,
      ip: ip,
      timestamp: timestamp,
      supabase: savedToSupabase
    });
  } catch (err) {
    console.error('Track visit error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};
