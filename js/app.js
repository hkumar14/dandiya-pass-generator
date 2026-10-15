/**
 * Dandiya Night - Main Application Controller
 * Handles mobile form validation, touch ripples, view transitions, sound cues, and backend API dispatch.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Core UI Elements
  const registrationForm = document.getElementById('registration-form');
  const formSection = document.getElementById('view-registration');
  const passSection = document.getElementById('view-pass');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingStatusText = document.getElementById('loading-status-text');

  // Pass Action Buttons
  const btnDownloadPdf = document.getElementById('btn-download-pdf');
  const btnDownloadImg = document.getElementById('btn-download-img');
  const btnSharePass = document.getElementById('btn-share-pass');
  const btnNewRegistration = document.getElementById('btn-new-registration');

  // Header quick buttons
  const btnAudioToggle = document.getElementById('btn-audio-toggle');

  // Input elements
  const inputName = document.getElementById('input-name');
  const selectYear = document.getElementById('select-year');
  const selectCourse = document.getElementById('select-course');
  const inputPhone = document.getElementById('input-phone');
  const inputEmail = document.getElementById('input-email');

  // Setup Touch Ripples on Action Buttons
  function createRipple(event, button) {
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    const clientX = event.clientX || (event.touches && event.touches[0].clientX);
    const clientY = event.clientY || (event.touches && event.touches[0].clientY);
    const x = clientX - rect.left - radius;
    const y = clientY - rect.top - radius;

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    circle.classList.add('ripple-wave');

    const existingRipple = button.getElementsByClassName('ripple-wave')[0];
    if (existingRipple) {
      existingRipple.remove();
    }

    button.appendChild(circle);
    setTimeout(() => circle.remove(), 650);
  }

  // Bind ripple to buttons
  document.querySelectorAll('.btn-gold-action, .mobile-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => createRipple(e, btn));
  });

  // Audio Toggle Button
  if (btnAudioToggle) {
    const updateAudioIcon = () => {
      const isMuted = window.festiveAudio ? window.festiveAudio.muted : false;
      btnAudioToggle.innerHTML = isMuted
        ? '<i class="fa-solid fa-volume-xmark text-slate-400"></i>'
        : '<i class="fa-solid fa-music text-amber-400 audio-pulse"></i>';
      btnAudioToggle.title = isMuted ? 'Unmute Festive Music & Sounds' : 'Mute Sounds';
    };
    updateAudioIcon();

    btnAudioToggle.addEventListener('click', () => {
      if (window.festiveAudio) {
        window.festiveAudio.toggleMute();
        if (!window.festiveAudio.muted) {
          window.festiveAudio.playChime(660, 0.4);
        }
        updateAudioIcon();
      }
    });
  }

  // If someone lands on index.html with ?pass_id=, redirect directly to pass.html
  const urlParams = new URLSearchParams(window.location.search);
  const deepPassId = urlParams.get('pass_id');
  if (deepPassId) {
    window.location.replace(`pass.html?pass_id=${encodeURIComponent(deepPassId)}`);
    return;
  }

  // Form Submission Process
  if (registrationForm) {
    registrationForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Form validation
      const name = inputName.value.trim();
      const year = selectYear ? selectYear.value.trim() : '';
      const course = selectCourse ? selectCourse.value.trim() : '';
      const phone = inputPhone.value.trim();
      const email = inputEmail.value.trim();

      if (!name) {
        showInputError(inputName, 'Please enter your full name');
        return;
      }
      if (!year) {
        showInputError(selectYear, 'Please select your Year');
        return;
      }
      if (!course) {
        showInputError(selectCourse, 'Please select your Course (BDS / MDS)');
        return;
      }
      if (!phone || phone.length < 10) {
        showInputError(inputPhone, 'Please enter a valid 10-digit mobile number');
        return;
      }
      if (!email || !email.includes('@')) {
        showInputError(inputEmail, 'Please enter a valid email address');
        return;
      }

      const combinedYearCourse = `${year} / ${course}`;

      // Start celebratory sequence!
      if (window.festiveAudio) {
        window.festiveAudio.playCelebrationTune();
      }

      // Step 2 Transition: Confetti explosion & Golden Spiral Loading Overlay
      window.passEngine.triggerConfetti();
      showLoadingSpiral(true);

      // Loading steps sequence for engaging mobile experience
      updateLoadingStatus('✨ Validating student credentials...', 0);
      
      const generatedPassId = window.passEngine.generatePassID();
      const record = {
        pass_id: generatedPassId,
        full_name: name,
        year_course: combinedYearCourse,
        phone: phone,
        email: email
      };

      setTimeout(() => {
        updateLoadingStatus('🎟️ Allocating official Pass ID: ' + generatedPassId, 600);
      }, 600);

      setTimeout(() => {
        updateLoadingStatus('🔐 Generating high-security gate QR Code...', 1200);
      }, 1200);

      // Save to Backend Endpoint & Local Backup
      try {
        if (window.apiService) {
          window.apiService.saveRegistration(record);
        }
      } catch (err) {
        console.warn('Persistence warning:', err);
      }

      // Store in storage so pass.html has immediate access
      try {
        sessionStorage.setItem('current_pass', JSON.stringify(record));
        localStorage.setItem('current_pass', JSON.stringify(record));
      } catch (e) {}

      setTimeout(() => {
        updateLoadingStatus('🎉 Digital Pass generated successfully!', 1600);
      }, 1600);

      // Smoothly redirect to Page 2: pass.html
      setTimeout(() => {
        showLoadingSpiral(false);
        window.location.href = `pass.html?pass_id=${encodeURIComponent(record.pass_id)}`;
      }, 2000);
    });
  }

  // Show / Hide Golden Spiral Loading Screen
  function showLoadingSpiral(show) {
    if (show) {
      if (loadingOverlay) loadingOverlay.classList.add('active');
      if (window.passEngine) window.passEngine.startSpiralAnimation('spiral-canvas');
    } else {
      if (loadingOverlay) loadingOverlay.classList.remove('active');
      if (window.passEngine) window.passEngine.stopSpiralAnimation();
    }
  }

  function updateLoadingStatus(text, delayMs) {
    if (loadingStatusText) {
      loadingStatusText.textContent = text;
    }
  }

  function showInputError(inputEl, message) {
    inputEl.focus();
    inputEl.classList.add('border-red-500', 'ring-2', 'ring-red-400');
    if (window.passEngine && window.passEngine.showToast) {
      window.passEngine.showToast(`⚠️ ${message}`);
    }
    setTimeout(() => {
      inputEl.classList.remove('border-red-500', 'ring-2', 'ring-red-400');
    }, 3000);
  }
});
