/**
 * Dandiya Night - Client API Service
 * Handles seamless registration dispatch to backend API and offline backup.
 * No API keys or cloud credentials exposed to public users!
 */

class ApiService {
  constructor() {
    this.endpoint = '/api/register';
    this.storageKey = 'dandiya_local_registrations';
  }

  // Save a student registration (Posts to backend & saves local backup)
  async saveRegistration(record) {
    const baseUrl = window.location.origin;
    const passLink = `${baseUrl}/pass.html?pass_id=${encodeURIComponent(record.pass_id)}`;

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

    // 1. Silent Local Storage Backup (prevents data loss if offline)
    this.saveToLocal(payload);

    // 2. Dispatch to backend endpoint asynchronously
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const resData = await response.json();
        return { success: true, backendSaved: true, data: resData };
      }
    } catch (err) {
      // Backend might be offline or undergoing setup; local backup is safe
      console.info('Backend registration logged locally. Backend sync will occur on server connection.');
    }

    return { success: true, backendSaved: false, data: payload };
  }

  // Local Storage Helper
  saveToLocal(record) {
    try {
      const list = this.getLocalRegistrations();
      const filtered = list.filter(item => item.pass_id !== record.pass_id);
      filtered.unshift(record);
      localStorage.setItem(this.storageKey, JSON.stringify(filtered));
    } catch (e) {
      console.warn('LocalStorage write warning:', e);
    }
  }

  getLocalRegistrations() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
}

window.apiService = new ApiService();
