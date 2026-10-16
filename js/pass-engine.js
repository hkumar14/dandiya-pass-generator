/**
 * Dandiya Night - Pass Generation, Spiral Loading Animation & PDF Export Engine
 */

class PassEngine {
  constructor() {
    this.currentPassData = null;
    this.spiralAnimId = null;
  }

  // Generate unique alphanumeric pass ID matching user's reference (e.g. DN-ZUUE9S)
  generatePassID() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous characters (0, O, 1, I)
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `DN-${code}`;
  }

  // Render Golden Spiral Particle Animation on Canvas
  startSpiralAnimation(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 240;
    const height = 240;
    canvas.width = width;
    canvas.height = height;

    const centerX = width / 2;
    const centerY = height / 2;
    const particles = [];
    const numParticles = 65;

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        angle: (i / numParticles) * Math.PI * 4,
        radius: (i / numParticles) * 90 + 10,
        speed: 0.04 + (i / numParticles) * 0.02,
        size: Math.random() * 2.5 + 1.5,
        alpha: Math.random() * 0.6 + 0.4,
        color: i % 2 === 0 ? '#FFE082' : '#F5A623'
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Center glowing orb
      const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 35);
      glow.addColorStop(0, 'rgba(255, 230, 140, 0.9)');
      glow.addColorStop(0.4, 'rgba(245, 166, 35, 0.4)');
      glow.addColorStop(1, 'rgba(245, 166, 35, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 35, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing golden star at core
      const pulse = Math.sin(Date.now() * 0.007) * 2;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.fillStyle = '#FFF8E1';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      const r = 8 + pulse;
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.fill();
      ctx.restore();

      // Swirling spiral arms
      particles.forEach(p => {
        p.angle += p.speed;
        p.radius -= 0.35;
        if (p.radius < 8) {
          p.radius = 95;
          p.angle = Math.random() * Math.PI * 2;
        }

        const x = centerX + Math.cos(p.angle) * p.radius;
        const y = centerY + Math.sin(p.angle) * p.radius;

        ctx.save();
        ctx.globalAlpha = p.alpha * (p.radius / 95);
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      this.spiralAnimId = requestAnimationFrame(render);
    };

    render();
  }

  stopSpiralAnimation() {
    if (this.spiralAnimId) {
      cancelAnimationFrame(this.spiralAnimId);
      this.spiralAnimId = null;
    }
  }

  // Trigger Festive Confetti Explosion
  triggerConfetti() {
    if (typeof confetti !== 'function') return;

    // Side cannon bursts (Left & Right)
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#FFD700', '#FF4136', '#FF851B', '#2ECC40', '#B10DC9']
    });

    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#FFD700', '#FF4136', '#FF851B', '#2ECC40', '#B10DC9']
    });

    // Central golden shower
    setTimeout(() => {
      confetti({
        particleCount: 70,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#FFE082', '#FFD700', '#F5A623', '#FFFFFF']
      });
    }, 250);
  }

  // Generate QR Code with high crispness
  generateQRCode(containerId, qrPayload) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    // Encode verification data string
    const encodedData = typeof qrPayload === 'string' ? qrPayload : JSON.stringify(qrPayload);

    new QRCode(container, {
      text: encodedData,
      width: 112,
      height: 112,
      colorDark: '#120508',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  // Alias for renderPass
  renderPassCard(data) {
    return this.renderPass(data);
  }

  // Populate Pass UI matching reference image
  renderPass(data) {
    this.currentPassData = data;

    // Elements
    const nameEl = document.getElementById('pass-display-name');
    const courseEl = document.getElementById('pass-display-course');
    const idEl = document.getElementById('pass-display-id');

    if (nameEl) nameEl.textContent = data.full_name || 'STUDENT NAME';
    if (courseEl) courseEl.textContent = data.year_course || 'Intern / Outsider';
    if (idEl) idEl.textContent = data.pass_id || 'DN-XXXXXX';

    // QR Code data: Include verification URL + student info
    const verificationPayload = {
      event: 'Dandiya Night 2026',
      pass_id: data.pass_id,
      name: data.full_name,
      course: data.year_course,
      date: '19-OCT-2026',
      venue: 'College Ground',
      valid: true
    };

    this.generateQRCode('pass-qr-code-element', verificationPayload);
  }

  // Export Pass as High Resolution PDF
  async downloadPassPDF() {
    const passCard = document.getElementById('digital-pass-card');
    if (!passCard) return;

    if (window.festiveAudio) window.festiveAudio.playClick();

    const originalButton = document.getElementById('btn-download-pdf');
    if (originalButton) {
      originalButton.disabled = true;
      originalButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...';
    }

    // Save current transform to prevent 3D clipping during canvas rasterization
    const prevTransform = passCard.style.transform;
    passCard.style.transform = 'none';

    try {
      // Ensure web fonts are completely loaded before capturing canvas
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // High-res html2canvas capture (scale 3 for ultra-crisp print quality)
      const canvas = await html2canvas(passCard, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FAF5EA',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 440,
        onclone: (clonedDoc) => {
          const card = clonedDoc.getElementById('digital-pass-card');
          if (card) {
            card.style.width = '420px';
            card.style.maxWidth = '420px';
            card.style.transform = 'none';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      // Resolve jsPDF constructor across different CDN versions
      const jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
      if (!jsPDFConstructor) {
        throw new Error('jsPDF library not loaded');
      }

      // Dynamically preserve exact aspect ratio of ticket in PDF
      const pdfWidth = 108; // mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDFConstructor({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      // Fit image onto PDF page
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      const passId = (this.currentPassData && this.currentPassData.pass_id) ? this.currentPassData.pass_id : 'DN-PASS';
      pdf.save(`Dandiya_Night_Pass_${passId}.pdf`);

      // Toast notification
      this.showToast('🎉 Digital Pass PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF Generation Error:', err);
      this.showToast('⚠️ Could not generate PDF. Please try "Save as Image".');
    } finally {
      passCard.style.transform = prevTransform;
      if (originalButton) {
        originalButton.disabled = false;
        originalButton.innerHTML = '<i class="fa-solid fa-file-pdf text-red-700 text-lg"></i> Download Pass as PDF';
      }
    }
  }

  // Export Pass as High Resolution Image (PNG)
  async downloadPassImage() {
    const passCard = document.getElementById('digital-pass-card');
    if (!passCard) return;

    if (window.festiveAudio) window.festiveAudio.playClick();

    const originalButton = document.getElementById('btn-download-img');
    if (originalButton) {
      originalButton.disabled = true;
      originalButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Image...';
    }

    const prevTransform = passCard.style.transform;
    passCard.style.transform = 'none';

    try {
      // Ensure web fonts are completely loaded before capturing canvas
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(passCard, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FAF5EA',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 440,
        onclone: (clonedDoc) => {
          const card = clonedDoc.getElementById('digital-pass-card');
          if (card) {
            card.style.width = '420px';
            card.style.maxWidth = '420px';
            card.style.transform = 'none';
          }
        }
      });

      const image = canvas.toDataURL('image/png');
      const passId = (this.currentPassData && this.currentPassData.pass_id) ? this.currentPassData.pass_id : 'DN-PASS';

      const link = document.createElement('a');
      link.download = `Dandiya_Night_Pass_${passId}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showToast('🖼️ Pass image saved to gallery!');
    } catch (err) {
      console.error('Image Download Error:', err);
      this.showToast('⚠️ Error saving image.');
    } finally {
      passCard.style.transform = prevTransform;
      if (originalButton) {
        originalButton.disabled = false;
        originalButton.innerHTML = '<i class="fa-solid fa-image text-amber-400"></i> Save Image';
      }
    }
  }

  // Mobile Web Share API or Clipboard Copy
  async sharePass() {
    if (!this.currentPassData) return;
    const passId = this.currentPassData.pass_id;
    const name = this.currentPassData.full_name;
    const shareUrl = `${window.location.origin}${window.location.pathname}?pass_id=${passId}`;

    const shareData = {
      title: 'Dandiya Night 2026 - Digital Entry Pass',
      text: `🎉 Here is my verified Digital Entry Pass for Dandiya Night 2026!\nStudent: ${name}\nPass ID: ${passId}\nDate: 19 October 2026\nVenue: College Ground`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Share error:', err);
      }
    }

    // Fallback: Copy link to clipboard
    try {
      await navigator.clipboard.writeText(`${shareData.text}\nPass Link: ${shareUrl}`);
      this.showToast('📋 Pass link & details copied to clipboard!');
    } catch (e) {
      this.showToast(`Pass ID: ${passId}`);
    }
  }

  showToast(message) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] bg-slate-900/95 border border-amber-400/40 text-amber-100 text-xs sm:text-sm px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none transition-all duration-300 opacity-0 translate-y-3';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.remove('opacity-0', 'translate-y-3');
    toast.classList.add('opacity-100', 'translate-y-0');

    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-3');
    }, 3200);
  }
}

window.passEngine = new PassEngine();
