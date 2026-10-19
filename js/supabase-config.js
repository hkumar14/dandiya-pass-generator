/**
 * Dandiya Night - Supabase Cloud Storage & Sync Layer
 * Handles registration persistence, cloud sync with Supabase, offline backup, and admin export.
 */

class SupabaseService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.tableName = 'dandiya_registrations';

    // Load credentials from localStorage or defaults
    this.url = localStorage.getItem('dandiya_supabase_url') || '';
    this.key = localStorage.getItem('dandiya_supabase_key') || '';

    this.initClient();
  }

  initClient() {
    if (this.url && this.key && window.supabase) {
      try {
        this.client = window.supabase.createClient(this.url, this.key);
        this.isConfigured = true;
      } catch (e) {
        console.warn('Supabase initialization error:', e);
        this.isConfigured = false;
      }
    } else {
      this.isConfigured = false;
    }
  }

  saveConfig(url, key) {
    this.url = url.trim();
    this.key = key.trim();
    localStorage.setItem('dandiya_supabase_url', this.url);
    localStorage.setItem('dandiya_supabase_key', this.key);
    this.initClient();
    return this.isConfigured;
  }

  async testConnection() {
    if (!this.client) return { success: false, message: 'Supabase client not initialized. Check URL and Anon Key.' };
    try {
      const { data, error } = await this.client.from(this.tableName).select('id').limit(1);
      if (error) {
        // Table might not exist yet
        return { success: false, message: `Connected to Supabase, but error querying '${this.tableName}': ${error.message}. Did you run the SQL schema?` };
      }
      return { success: true, message: `Connected to Supabase successfully! Table '${this.tableName}' is ready.` };
    } catch (err) {
      return { success: false, message: `Connection failed: ${err.message}` };
    }
  }

  // Save a student registration (Cloud + Local fallback)
  async saveRegistration(record) {
    // Generate full pass link
    const currentOrigin = window.location.origin + window.location.pathname;
    const passLink = `${currentOrigin}?pass_id=${record.pass_id}`;

    const payload = {
      pass_id: record.pass_id,
      full_name: record.full_name,
      year_course: record.year_course,
      phone: record.phone,
      email: record.email,
      pass_url: passLink,
      created_at: new Date().toISOString(),
      status: 'Active'
    };

    // Always save to localStorage backup first
    this.saveToLocal(payload);

    // If Supabase is connected, insert into Supabase
    if (this.isConfigured && this.client) {
      try {
        const { data, error } = await this.client
          .from(this.tableName)
          .insert([payload])
          .select();

        if (error) {
          console.warn('Supabase insert error, saved locally:', error);
          return { success: true, cloud: false, offline: true, error: error.message, data: payload };
        }
        return { success: true, cloud: true, offline: false, data: data[0] || payload };
      } catch (err) {
        console.warn('Network error pushing to Supabase, backed up locally:', err);
        return { success: true, cloud: false, offline: true, error: err.message, data: payload };
      }
    }

    return { success: true, cloud: false, localOnly: true, data: payload };
  }

  // Backup to localStorage
  saveToLocal(record) {
    try {
      const localList = this.getLocalRegistrations();
      // Avoid duplicate pass_id
      const filtered = localList.filter(item => item.pass_id !== record.pass_id);
      filtered.unshift(record);
      localStorage.setItem('dandiya_local_registrations', JSON.stringify(filtered));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  }

  getLocalRegistrations() {
    try {
      const raw = localStorage.getItem('dandiya_local_registrations');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  // Fetch all registrations (Supabase preferred, fallback to local)
  async getAllRegistrations() {
    if (this.isConfigured && this.client) {
      try {
        const { data, error } = await this.client
          .from(this.tableName)
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return { source: 'supabase', list: data };
        }
      } catch (err) {
        console.warn('Failed to fetch from Supabase, using local:', err);
      }
    }

    return { source: 'local', list: this.getLocalRegistrations() };
  }

  // Export registrations as CSV
  exportCSV(registrations) {
    if (!registrations || registrations.length === 0) return null;
    const headers = ['Pass ID', 'Full Name', 'Year / Course', 'Phone', 'Email', 'Pass URL', 'Registration Date', 'Status'];
    const rows = registrations.map(r => [
      `"${r.pass_id || ''}"`,
      `"${(r.full_name || '').replace(/"/g, '""')}"`,
      `"${(r.year_course || '').replace(/"/g, '""')}"`,
      `"${r.phone || ''}"`,
      `"${r.email || ''}"`,
      `"${r.pass_url || ''}"`,
      `"${r.created_at || ''}"`,
      `"${r.status || 'Active'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Dandiya_Night_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }

  // Recommended Supabase SQL DDL Schema
  getRecommendedSchemaSQL() {
    return `-- ==========================================
-- Dandiya Night Registrations Supabase Schema
-- Run this in your Supabase SQL Editor
-- ==========================================

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

-- Enable Row Level Security (RLS)
ALTER TABLE dandiya_registrations ENABLE ROW LEVEL SECURITY;

-- 1. Allow public anonymous inserts for self-registration
CREATE POLICY "Enable public pass registrations" 
ON dandiya_registrations 
FOR INSERT 
WITH CHECK (true);

-- 2. Allow public read access to verify passes at the entrance gate
CREATE POLICY "Enable public read for pass verification" 
ON dandiya_registrations 
FOR SELECT 
USING (true);

-- ==========================================
-- Site Visitor IP & Timestamp Tracking Table
-- ==========================================
CREATE TABLE IF NOT EXISTS site_visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address VARCHAR(100) NOT NULL,
    page VARCHAR(255) DEFAULT '/',
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable public anonymous insert for site_visits" 
ON site_visits 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable read for site_visits" 
ON site_visits 
FOR SELECT 
USING (true);
`;
  }
}

window.supabaseService = new SupabaseService();
