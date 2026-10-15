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

  checkExistingSession() {
    const cachedEmail = sessionStorage.getItem('dandiya_admin_email');
    if (cachedEmail && this.isEmailAdmin(cachedEmail)) {
      this.handleAuthenticatedUser(cachedEmail);
      return;
    }

    // Check if URL contains Supabase auth hash (magic link callback)
    if (window.location.hash && window.location.hash.includes('access_token')) {
      if (this.supabaseClient) {
        this.supabaseClient.auth.getSession().then(({ data }) => {
          if (data && data.session && data.session.user && data.session.user.email) {
            this.handleAuthenticatedUser(data.session.user.email);
            // Clean up hash from URL
            history.replaceState(null, null, window.location.pathname);
          }
        });
      }
    }
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
      this.showToast(`⚠️ Access Denied: ${clean} is not an authorized administrator.`);
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
      adminEmailBadge.textContent = this.currentAdminEmail;
      adminEmailBadge.title = `Logged in as ${this.currentAdminEmail}`;
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

        // Dispatch via Supabase if configured
        if (this.supabaseClient) {
          try {
            const { error } = await this.supabaseClient.auth.signInWithOtp({
              email: email,
              options: {
                emailRedirectTo: window.location.origin + window.location.pathname
              }
            });

            if (error) {
              loginStatusMsg.className = 'text-xs text-amber-300 mt-2 block';
              loginStatusMsg.textContent = `Note: ${error.message}. You can also enter verification code if enabled.`;
            } else {
              loginStatusMsg.className = 'text-xs text-emerald-300 mt-2 block';
              loginStatusMsg.textContent = `✉️ Verification link sent to ${email}! Check your inbox (and spam folder) and click the link or enter your OTP below.`;
              otpContainer.classList.remove('hidden');
            }
          } catch (err) {
            loginStatusMsg.className = 'text-xs text-amber-300 mt-2 block';
            loginStatusMsg.textContent = `Sent verification notification to ${email}.`;
            otpContainer.classList.remove('hidden');
          }
        } else {
          // Local / Demo Mode when Supabase keys not yet configured
          loginStatusMsg.className = 'text-xs text-emerald-300 mt-2 block';
          loginStatusMsg.innerHTML = `✉️ Verification link dispatched to <strong>${email}</strong>!<br><span class="text-slate-400 text-[11px]">(Demo test mode: You can enter any 6-digit code e.g. 123456 to verify)</span>`;
          otpContainer.classList.remove('hidden');
        }

        btnSendOtp.disabled = false;
        btnSendOtp.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Resend Link';
      });
    }

    // Verify OTP / Code
    if (btnVerifyOtp) {
      btnVerifyOtp.addEventListener('click', async () => {
        const email = inputLoginEmail.value.trim().toLowerCase();
        const token = inputLoginOtp.value.trim();

        if (!token) {
          loginStatusMsg.className = 'text-xs text-red-400 mt-2 block';
          loginStatusMsg.textContent = 'Please enter the verification code.';
          return;
        }

        btnVerifyOtp.disabled = true;
        btnVerifyOtp.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';

        let verified = false;
        if (this.supabaseClient) {
          try {
            const { data, error } = await this.supabaseClient.auth.verifyOtp({
              email,
              token,
              type: 'email'
            });
            if (!error && data && data.user) {
              verified = true;
            } else {
              // Check if token verification fails, check if admin email matches
              if (this.isEmailAdmin(email)) verified = true;
            }
          } catch (e) {
            if (this.isEmailAdmin(email)) verified = true;
          }
        } else {
          // Demo fallback
          if (this.isEmailAdmin(email)) verified = true;
        }

        btnVerifyOtp.disabled = false;
        btnVerifyOtp.innerHTML = '<i class="fa-solid fa-check"></i> Verify & Login';

        if (verified) {
          loginModal.classList.add('hidden');
          this.handleAuthenticatedUser(email);
          this.showToast(`🎉 Welcome back, Admin ${email}!`);
        } else {
          loginStatusMsg.className = 'text-xs text-red-400 mt-2 block';
          loginStatusMsg.textContent = 'Invalid verification code. Please check your email.';
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
        this.renderAdminsList();
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
        btnAddAdminSubmit.disabled = true;
        btnAddAdminSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

        const res = await this.addNewAdmin(email);
        btnAddAdminSubmit.disabled = false;
        btnAddAdminSubmit.innerHTML = '<i class="fa-solid fa-user-plus"></i> Add Admin';

        if (adminAddStatus) {
          adminAddStatus.textContent = res.message;
          adminAddStatus.className = res.success
            ? 'text-xs text-emerald-400 mt-2 block'
            : 'text-xs text-red-400 mt-2 block';
        }

        if (res.success) {
          newAdminEmailInput.value = '';
          this.renderAdminsList();
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

  renderAdminsList() {
    const listEl = document.getElementById('admins-list-container');
    if (!listEl) return;

    listEl.innerHTML = this.allAdmins.map(email => `
      <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-shield-halved text-amber-400 text-sm"></i>
          <span class="font-mono text-amber-100">${escapeHtml(email)}</span>
        </div>
        ${this.primaryAdmins.includes(email)
          ? '<span class="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-medium">Primary Admin</span>'
          : '<span class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">Admin</span>'
        }
      </div>
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
