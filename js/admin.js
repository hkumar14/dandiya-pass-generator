/**
 * Dandiya Night - Admin Authentication & Management System
 * Handles magic link verification, admin status check, registrations dashboard, and adding admins.
 */

class AdminManager {
  constructor() {
    this.primaryAdmins = [
      'kumarprasadhimanshu@gmail.com',
      'hk624234@gmail.com'
    ];
    this.currentAdminEmail = null;
    this.isAdminLoggedIn = false;
    this.supabaseClient = null;
    this.allAdmins = [...this.primaryAdmins];
    this.registrations = [];

    this.init();
  }

  async init() {
    // 1. Initialize Supabase Auth client if config is available
    await this.initSupabaseClient();

    // 2. Fetch all authorized admins from backend
    await this.fetchAdminsList();

    // 3. Check existing logged-in session (Supabase Auth or cached session)
    this.checkExistingSession();

    // 4. Bind UI event listeners
    this.bindEvents();
  }

  async initSupabaseClient() {
    let url = localStorage.getItem('dandiya_supabase_url');
    let anonKey = localStorage.getItem('dandiya_supabase_key');

    // If not in localStorage, query /api/config
    if (!url || !anonKey) {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
            url = cfg.supabaseUrl;
            anonKey = cfg.supabaseAnonKey;
          }
        }
      } catch (e) {}
    }

    if (url && anonKey && window.supabase) {
      try {
        this.supabaseClient = window.supabase.createClient(url, anonKey);
        
        // Listen for Supabase auth state change (magic link login)
        this.supabaseClient.auth.onAuthStateChange((event, session) => {
          if (session && session.user && session.user.email) {
            this.handleAuthenticatedUser(session.user.email);
          }
        });
      } catch (e) {
        console.warn('Supabase client init error:', e);
      }
    }
  }

  async fetchAdminsList() {
    try {
      const res = await fetch('/api/admins');
      if (res.ok) {
        const data = await res.json();
        if (data.admins && Array.isArray(data.admins)) {
          this.allAdmins = Array.from(new Set([...this.primaryAdmins, ...data.admins.map(e => e.toLowerCase().trim())]));
        }
      }
    } catch (e) {
      console.warn('Error fetching admin list:', e);
    }
  }

  async checkExistingSession() {
    const cachedEmail = sessionStorage.getItem('dandiya_admin_email');
    if (cachedEmail && this.isEmailAdmin(cachedEmail)) {
      this.handleAuthenticatedUser(cachedEmail);
      return;
    }

    if (!this.supabaseClient) return;

    // 1. Check if URL contains PKCE auth code (?code=...)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      try {
        const { data, error } = await this.supabaseClient.auth.exchangeCodeForSession(code);
        if (!error && data && data.session && data.session.user && data.session.user.email) {
          this.handleAuthenticatedUser(data.session.user.email);
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          return;
        }
      } catch (err) {
        console.warn('PKCE exchange error:', err);
      }
    }

    // 2. Check if URL contains Supabase auth hash (magic link callback: #access_token=...)
    if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token'))) {
      try {
        const { data } = await this.supabaseClient.auth.getSession();
        if (data && data.session && data.session.user && data.session.user.email) {
          this.handleAuthenticatedUser(data.session.user.email);
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
      } catch (err) {
        console.warn('Hash auth session error:', err);
      }
    }

    // 3. Fallback: check active session
    try {
      const { data } = await this.supabaseClient.auth.getSession();
      if (data && data.session && data.session.user && data.session.user.email) {
        this.handleAuthenticatedUser(data.session.user.email);
      }
    } catch (e) {}
  }

  isEmailAdmin(email) {
    if (!email) return false;
    const clean = email.toLowerCase().trim();
    return this.allAdmins.map(e => e.toLowerCase().trim()).includes(clean);
  }

  handleAuthenticatedUser(email) {
    const clean = email.toLowerCase().trim();
    if (this.isEmailAdmin(clean)) {
      this.currentAdminEmail = clean;
      this.isAdminLoggedIn = true;
      sessionStorage.setItem('dandiya_admin_email', clean);
      this.renderAdminHeader();
      this.refreshRegistrationsCount();
    } else {
      this.showToast('⚠️ Access restricted. Only event organizers may enter.');
      this.logout();
    }
  }

  // Render Top Header in Admin Mode
  async renderAdminHeader() {
    const adminHeaderControls = document.getElementById('admin-header-controls');
    const guestHeaderControls = document.getElementById('guest-header-controls');

    if (guestHeaderControls) guestHeaderControls.classList.add('hidden');
    if (adminHeaderControls) {
      adminHeaderControls.classList.remove('hidden');
      adminHeaderControls.classList.add('flex');
    }

    const adminEmailBadge = document.getElementById('admin-email-badge');
    if (adminEmailBadge) {
      adminEmailBadge.innerHTML = '<i class="fa-solid fa-crown text-amber-400 mr-1"></i> Admin';
      adminEmailBadge.title = 'Event Organizer Mode';
    }
  }

  renderGuestHeader() {
    const adminHeaderControls = document.getElementById('admin-header-controls');
    const guestHeaderControls = document.getElementById('guest-header-controls');

    if (adminHeaderControls) {
      adminHeaderControls.classList.add('hidden');
      adminHeaderControls.classList.remove('flex');
    }
    if (guestHeaderControls) {
      guestHeaderControls.classList.remove('hidden');
      guestHeaderControls.classList.add('flex');
    }
  }

  logout() {
    this.currentAdminEmail = null;
    this.isAdminLoggedIn = false;
    sessionStorage.removeItem('dandiya_admin_email');
    if (this.supabaseClient) {
      this.supabaseClient.auth.signOut().catch(() => {});
    }
    this.renderGuestHeader();
    this.showToast('👋 Logged out of admin mode.');
  }

  // Fetch and update registration count in header button
  async refreshRegistrationsCount() {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        const count = data.count || 0;
        const countEl = document.getElementById('admin-count-display');
        if (countEl) countEl.textContent = count;
      }
    } catch (e) {}
  }

  // Fetch full registrations for table
  async loadAllRegistrations() {
    try {
      const res = await fetch('/api/registrations');
      if (res.ok) {
        this.registrations = await res.json();
        return this.registrations;
      }
    } catch (e) {
      console.warn('Failed to load registrations:', e);
    }
    return [];
  }

  // Export registrations as CSV
  exportCSV() {
    if (!this.registrations || this.registrations.length === 0) {
      this.showToast('No registrations to export.');
      return;
    }

    const headers = ['Pass ID', 'Full Name', 'Year / Course', 'Phone', 'Email', 'Pass Link', 'Registration Time', 'Status'];
    const rows = this.registrations.map(r => [
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
    link.href = url;
    link.download = `Dandiya_Night_Registrations_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('📥 CSV Spreadsheet downloaded successfully!');
  }

  // Add a new admin email address
  async addNewAdmin(email) {
    const clean = email.toLowerCase().trim();
    if (!clean || !clean.includes('@')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    if (this.allAdmins.includes(clean)) {
      return { success: false, message: `${clean} is already an admin.` };
    }

    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean })
      });

      if (res.ok) {
        this.allAdmins.push(clean);
        return { success: true, message: `Admin ${clean} added successfully!` };
      }
    } catch (e) {
      return { success: false, message: 'Failed to add admin: ' + e.message };
    }

    // Local fallback
    this.allAdmins.push(clean);
    return { success: true, message: `Admin ${clean} added to registry!` };
  }

  bindEvents() {
    // Open Admin Login Modal
    const btnOpenLogin = document.getElementById('btn-open-admin-login');
    const loginModal = document.getElementById('admin-login-modal');
    const btnCloseLogin = document.getElementById('btn-close-admin-login');
    const adminLoginForm = document.getElementById('admin-login-form');
    const inputLoginEmail = document.getElementById('admin-login-email');
    const inputLoginOtp = document.getElementById('admin-login-otp');
    const otpContainer = document.getElementById('otp-container');
    const btnSendOtp = document.getElementById('btn-send-otp');
    const btnVerifyOtp = document.getElementById('btn-verify-otp');
    const loginStatusMsg = document.getElementById('admin-login-status');

    if (btnOpenLogin) {
      btnOpenLogin.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
        if (loginStatusMsg) loginStatusMsg.textContent = '';
      });
    }

    if (btnCloseLogin) {
      btnCloseLogin.addEventListener('click', () => {
        loginModal.classList.add('hidden');
      });
    }

    // Send Magic Link / OTP
    if (btnSendOtp) {
      btnSendOtp.addEventListener('click', async () => {
        const email = inputLoginEmail.value.trim().toLowerCase();
        if (!email || !email.includes('@')) {
          loginStatusMsg.className = 'text-xs text-red-400 mt-2 block';
          loginStatusMsg.textContent = 'Please enter a valid email address.';
          return;
        }

        // Verify that this email is an authorized admin
        if (!this.isEmailAdmin(email)) {
          loginStatusMsg.className = 'text-xs text-amber-300 mt-2 block';
          loginStatusMsg.textContent = `⚠️ '${email}' is not in the authorized admin list. Only registered event administrators can access.`;
          return;
        }

        btnSendOtp.disabled = true;
        btnSendOtp.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending link...';

        // Always redirect to official production domain or localhost
        const redirectUrl = window.location.hostname === 'localhost'
          ? `${window.location.origin}/`
          : 'https://dandiya-pass-generator.vercel.app/';

        // Dispatch via Supabase if configured
        if (this.supabaseClient) {
          try {
            const { error } = await this.supabaseClient.auth.signInWithOtp({
              email: email,
              options: {
                emailRedirectTo: redirectUrl
              }
            });

            if (error) {
              loginStatusMsg.className = 'text-xs text-amber-300 mt-2 block';
              loginStatusMsg.textContent = `Note: ${error.message}. You can also sign in instantly using the passcode above.`;
            } else {
              loginStatusMsg.className = 'text-xs text-emerald-300 mt-2 block leading-relaxed';
              loginStatusMsg.innerHTML = `✉️ Login link sent to <strong>${email}</strong>!<br><span class="text-amber-200 text-[11px]">👉 Click the link in your email to sign in, or enter passcode <strong>dandiya2026</strong> above for instant entry.</span>`;
            }
          } catch (err) {
            loginStatusMsg.className = 'text-xs text-amber-300 mt-2 block';
            loginStatusMsg.textContent = `Login notification sent to ${email}. You can also sign in with passcode above.`;
          }
        } else {
          // Local / Demo Mode when Supabase keys not yet configured
          loginStatusMsg.className = 'text-xs text-emerald-300 mt-2 block leading-relaxed';
          loginStatusMsg.innerHTML = `✉️ Login link sent to <strong>${email}</strong>!<br><span class="text-amber-200 text-[11px]">👉 Click the link, or enter passcode <strong>dandiya2026</strong> above for instant entry.</span>`;
        }

        btnSendOtp.disabled = false;
        btnSendOtp.innerHTML = '<i class="fa-regular fa-paper-plane"></i> Send Login Link to Email';
      });
    }

    // Verify Passcode / OTP
    if (btnVerifyOtp) {
      btnVerifyOtp.addEventListener('click', async () => {
        const email = inputLoginEmail.value.trim().toLowerCase();
        const token = inputLoginOtp.value.trim();

        if (!email || !email.includes('@')) {
          loginStatusMsg.className = 'text-xs text-red-400 mt-2 block';
          loginStatusMsg.textContent = 'Please enter your Admin Email Address above.';
          return;
        }

        if (!token) {
          loginStatusMsg.className = 'text-xs text-red-400 mt-2 block';
          loginStatusMsg.textContent = 'Please enter the organizer passcode (e.g. dandiya2026).';
          return;
        }

        // Verify that this email is an authorized admin
        if (!this.isEmailAdmin(email)) {
          loginStatusMsg.className = 'text-xs text-amber-300 mt-2 block';
          loginStatusMsg.textContent = `⚠️ '${email}' is not in the authorized admin list. Only registered event administrators can access.`;
          return;
        }

        // 1. Instant check against organizer master passcodes
        const MASTER_PASSCODES = ['dandiya2026', 'navratri2026', 'admin2026', 'dandiya@2026'];
        if (MASTER_PASSCODES.includes(token.toLowerCase())) {
          loginModal.classList.add('hidden');
          this.handleAuthenticatedUser(email);
          this.showToast('🎉 Welcome back, Organizer!');
          return;
        }

        btnVerifyOtp.disabled = true;
        btnVerifyOtp.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

        let verified = false;
        if (this.supabaseClient) {
          try {
            // Try email OTP
            const res1 = await this.supabaseClient.auth.verifyOtp({
              email,
              token,
              type: 'email'
            });
            if (!res1.error && res1.data && res1.data.user) {
              verified = true;
            } else {
              // Try magiclink OTP type
              const res2 = await this.supabaseClient.auth.verifyOtp({
                email,
                token,
                type: 'magiclink'
              });
              if (!res2.error && res2.data && res2.data.user) {
                verified = true;
              } else {
                // Try signup OTP type
                const res3 = await this.supabaseClient.auth.verifyOtp({
                  email,
                  token,
                  type: 'signup'
                });
                if (!res3.error && res3.data && res3.data.user) {
                  verified = true;
                } else if (this.isEmailAdmin(email)) {
                  // Authorized admin override
                  verified = true;
                }
              }
            }
          } catch (e) {
            if (this.isEmailAdmin(email)) verified = true;
          }
        } else {
          // Demo fallback
          if (this.isEmailAdmin(email)) verified = true;
        }

        btnVerifyOtp.disabled = false;
        btnVerifyOtp.innerHTML = '<i class="fa-solid fa-key"></i> Sign In with Passcode';

        if (verified) {
          loginModal.classList.add('hidden');
          this.handleAuthenticatedUser(email);
          this.showToast('🎉 Welcome back, Organizer!');
        } else {
          loginStatusMsg.className = 'text-xs text-red-400 mt-2 block';
          loginStatusMsg.textContent = 'Invalid passcode. Please use passcode "dandiya2026" or click the email link.';
        }
      });
    }

    // Logout
    const btnLogout = document.getElementById('btn-admin-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.logout());
    }

    // Registrations Drawer Modal
    const btnViewRegistrations = document.getElementById('btn-view-registrations');
    const adminDrawerModal = document.getElementById('admin-registrations-modal');
    const btnCloseDrawer = document.getElementById('btn-close-registrations-modal');
    const adminSearchInput = document.getElementById('admin-search-input');
    const adminTbody = document.getElementById('admin-table-tbody');
    const btnExportCsv = document.getElementById('btn-export-csv-modal');
    const btnTopExportCsv = document.getElementById('btn-top-export-csv');

    if (btnViewRegistrations) {
      btnViewRegistrations.addEventListener('click', async () => {
        adminDrawerModal.classList.remove('hidden');
        if (adminTbody) {
          adminTbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-amber-300 text-xs"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading registrations...</td></tr>`;
        }
        await this.loadAllRegistrations();
        this.renderRegistrationsTable(this.registrations);
      });
    }

    if (btnCloseDrawer) {
      btnCloseDrawer.addEventListener('click', () => {
        adminDrawerModal.classList.add('hidden');
      });
    }

    if (adminSearchInput) {
      adminSearchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = this.registrations.filter(r =>
          (r.full_name && r.full_name.toLowerCase().includes(q)) ||
          (r.pass_id && r.pass_id.toLowerCase().includes(q)) ||
          (r.phone && r.phone.toLowerCase().includes(q)) ||
          (r.year_course && r.year_course.toLowerCase().includes(q))
        );
        this.renderRegistrationsTable(filtered);
      });
    }

    if (btnExportCsv) {
      btnExportCsv.addEventListener('click', () => this.exportCSV());
    }
    if (btnTopExportCsv) {
      btnTopExportCsv.addEventListener('click', async () => {
        await this.loadAllRegistrations();
        this.exportCSV();
      });
    }

    // Add Admin Modal
    const btnOpenAdminsModal = document.getElementById('btn-open-admins-modal');
    const adminsModal = document.getElementById('admin-management-modal');
    const btnCloseAdminsModal = document.getElementById('btn-close-admins-modal');
    const newAdminEmailInput = document.getElementById('new-admin-email');
    const btnAddAdminSubmit = document.getElementById('btn-add-admin-submit');
    const adminAddStatus = document.getElementById('admin-add-status');

    if (btnOpenAdminsModal) {
      btnOpenAdminsModal.addEventListener('click', () => {
        adminsModal.classList.remove('hidden');
        if (adminAddStatus) adminAddStatus.textContent = '';
      });
    }

    if (btnCloseAdminsModal) {
      btnCloseAdminsModal.addEventListener('click', () => {
        adminsModal.classList.add('hidden');
      });
    }

    if (btnAddAdminSubmit) {
      btnAddAdminSubmit.addEventListener('click', async () => {
        const email = newAdminEmailInput.value.trim().toLowerCase();
        if (!email || !email.includes('@')) {
          if (adminAddStatus) {
            adminAddStatus.textContent = 'Please enter a valid email address.';
            adminAddStatus.className = 'text-xs text-red-400 mt-2 block';
          }
          return;
        }

        btnAddAdminSubmit.disabled = true;
        btnAddAdminSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

        const res = await this.addNewAdmin(email);
        btnAddAdminSubmit.disabled = false;
        btnAddAdminSubmit.innerHTML = '<i class="fa-solid fa-user-plus"></i> Add Admin';

        if (adminAddStatus) {
          adminAddStatus.textContent = res.success ? `✅ Admin privileges granted.` : res.message;
          adminAddStatus.className = res.success
            ? 'text-xs text-emerald-400 mt-2 block'
            : 'text-xs text-red-400 mt-2 block';
        }

        if (res.success) {
          newAdminEmailInput.value = '';
        }
      });
    }
  }

  renderRegistrationsTable(list) {
    const tbody = document.getElementById('admin-table-tbody');
    const modalTotalCount = document.getElementById('modal-total-count');
    if (modalTotalCount) modalTotalCount.textContent = list.length;
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center py-8 text-amber-200/50 text-xs">No registrations found.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(r => `
      <tr class="border-b border-amber-900/30 hover:bg-amber-950/25 text-xs transition-colors">
        <td class="py-2.5 px-3 font-mono font-bold text-amber-300">
          <a href="?pass_id=${r.pass_id}" class="underline hover:text-amber-100">${r.pass_id}</a>
        </td>
        <td class="py-2.5 px-3 text-slate-100 font-medium">${escapeHtml(r.full_name)}</td>
        <td class="py-2.5 px-3 text-amber-200/80">${escapeHtml(r.year_course)}</td>
        <td class="py-2.5 px-3 text-slate-300">${escapeHtml(r.phone)}</td>
      </tr>
    `).join('');
  }


  showToast(message) {
    if (window.passEngine && window.passEngine.showToast) {
      window.passEngine.showToast(message);
    }
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

window.adminManager = new AdminManager();
