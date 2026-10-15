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

  // Check URL query parameters for direct pass verification
  const urlParams = new URLSearchParams(window.location.search);
  const deepPassId = urlParams.get('pass_id');
  if (deepPassId) {
    loadPassById(deepPassId);
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

      setTimeout(() => {
        updateLoadingStatus('🎉 Digital Pass generated successfully!', 1700);
      }, 1700);

      // Transition to Step 3: Digital Entry Pass view
      setTimeout(() => {
        showLoadingSpiral(false);

        // Render pass data into the pass card matching the reference image
        window.passEngine.renderPass(record);

        // Smooth flip transition
        formSection.classList.remove('view-active');
        formSection.classList.add('view-hidden');

        passSection.classList.remove('view-hidden');
        passSection.classList.add('view-active');

        // Scroll smoothly to pass top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Second celebratory sparkle
        window.passEngine.triggerConfetti();
        if (window.passEngine.showToast) {
          window.passEngine.showToast('🎟️ Your Official Dandiya Pass is Generated!');
        }
      }, 2200);
    });
  }

  // Show / Hide Golden Spiral Loading Screen
  function showLoadingSpiral(show) {
    if (show) {
      loadingOverlay.classList.add('active');
      window.passEngine.startSpiralAnimation('spiral-canvas');
    } else {
      loadingOverlay.classList.remove('active');
      window.passEngine.stopSpiralAnimation();
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

  // Digital Pass Action Buttons
  if (btnDownloadPdf) {
    btnDownloadPdf.addEventListener('click', () => {
      window.passEngine.downloadPassPDF();
    });
  }

  if (btnDownloadImg) {
    btnDownloadImg.addEventListener('click', () => {
      window.passEngine.downloadPassImage();
    });
  }

  if (btnSharePass) {
    btnSharePass.addEventListener('click', () => {
      window.passEngine.sharePass();
    });
  }

  // "Register Another Student" Button
  if (btnNewRegistration) {
    btnNewRegistration.addEventListener('click', () => {
      if (window.festiveAudio) window.festiveAudio.playChime(520, 0.3);

      // Clear inputs
      if (registrationForm) registrationForm.reset();

      passSection.classList.remove('view-active');
      passSection.classList.add('view-hidden');

      formSection.classList.remove('view-hidden');
      formSection.classList.add('view-active');

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Load an existing pass by ID from local backup
  function loadPassById(passId) {
    if (!window.apiService) return;
    const localList = window.apiService.getLocalRegistrations();
    const record = localList.find(r => r.pass_id === passId);

    if (record) {
      window.passEngine.renderPass(record);
      formSection.classList.remove('view-active');
      formSection.classList.add('view-hidden');
      passSection.classList.remove('view-hidden');
      passSection.classList.add('view-active');
    }
  }
});
