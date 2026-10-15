/**
 * Dandiya Night - Festive Particle Engine
 * Renders floating diyas, marigold petals, golden sparkles, musical notes, and glowing dandiya sticks
 */

class FestiveParticleEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.touchParticles = [];
    this.isActive = true;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Device performance check (limit count on mobile for smooth 60fps)
    this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
    this.maxParticles = this.isMobile ? 45 : 75;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Generate initial particle mix
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createRandomParticle(true));
    }

    // Touch & Mouse interactivity for mobile
    const addTouchSparks = (x, y) => {
      const count = this.isMobile ? 2 : 4;
      for (let i = 0; i < count; i++) {
        this.touchParticles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3 - 1,
          size: Math.random() * 3 + 1.5,
          alpha: 1,
          color: Math.random() > 0.4 ? '#FFD700' : '#FF9900',
          life: 1
        });
      }
    };

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        addTouchSparks(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      if (Math.random() > 0.6) {
        addTouchSparks(e.clientX, e.clientY);
      }
    });

    // Start rendering loop
    this.animate();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  createRandomParticle(initial = false) {
    const types = ['petal', 'sparkle', 'sparkle', 'diya', 'music', 'dandiya'];
    const type = types[Math.floor(Math.random() * types.length)];
    const yPos = initial ? Math.random() * this.height : (type === 'petal' ? -20 : this.height + 20);

    return {
      type,
      x: Math.random() * this.width,
      y: yPos,
      vx: (Math.random() - 0.5) * 1.2,
      vy: type === 'petal' ? (Math.random() * 0.9 + 0.6) : -(Math.random() * 0.8 + 0.4),
      size: type === 'diya' ? (Math.random() * 8 + 14) : (type === 'dandiya' ? (Math.random() * 8 + 18) : (Math.random() * 6 + 5)),
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      alpha: Math.random() * 0.6 + 0.35,
      alphaSpeed: (Math.random() * 0.015 + 0.005),
      oscillation: Math.random() * Math.PI * 2,
      oscSpeed: Math.random() * 0.03 + 0.01,
      color: type === 'petal'
        ? (Math.random() > 0.35 ? '#FFA000' : '#DC2626') // Marigold orange or Rose red
        : '#FFD700' // Gold
    };
  }

  drawSparkle(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.globalAlpha = p.alpha;
    this.ctx.fillStyle = '#FFE57F';
    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 10;

    // 4-point star sparkle
    this.ctx.beginPath();
    const r = p.size;
    this.ctx.moveTo(0, -r);
    this.ctx.quadraticCurveTo(0, 0, r, 0);
    this.ctx.quadraticCurveTo(0, 0, 0, r);
    this.ctx.quadraticCurveTo(0, 0, -r, 0);
    this.ctx.quadraticCurveTo(0, 0, 0, -r);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawPetal(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.rotation);
    this.ctx.globalAlpha = p.alpha;
    this.ctx.fillStyle = p.color;
    this.ctx.shadowColor = 'rgba(255, 120, 0, 0.4)';
    this.ctx.shadowBlur = 6;

    // Organic teardrop petal
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, p.size * 0.6, p.size * 1.1, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Subtle inner vein highlight
    this.ctx.strokeStyle = 'rgba(255, 240, 200, 0.35)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -p.size * 0.8);
    this.ctx.lineTo(0, p.size * 0.7);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawDiya(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.globalAlpha = p.alpha * 0.85;

    // Golden aura glow around lamp
    this.ctx.beginPath();
    this.ctx.arc(0, -p.size * 0.35, p.size * 1.2, 0, Math.PI * 2);
    const glowGrad = this.ctx.createRadialGradient(0, -p.size * 0.35, 2, 0, -p.size * 0.35, p.size * 1.2);
    glowGrad.addColorStop(0, 'rgba(255, 220, 100, 0.7)');
    glowGrad.addColorStop(0.5, 'rgba(255, 140, 0, 0.3)');
    glowGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
    this.ctx.fillStyle = glowGrad;
    this.ctx.fill();

    // Clay lamp base
    this.ctx.fillStyle = '#8D3A1B';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, p.size * 0.7, p.size * 0.35, 0, 0, Math.PI);
    this.ctx.fill();

    // Clay lamp rim
    this.ctx.strokeStyle = '#D97706';
    this.ctx.lineWidth = 1.2;
    this.ctx.stroke();

    // Flickering Diya Flame
    const flicker = Math.sin(Date.now() * 0.008 + p.x) * (p.size * 0.1);
    this.ctx.fillStyle = '#FFF7B2';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -p.size * 0.75 + flicker);
    this.ctx.quadraticCurveTo(p.size * 0.28, -p.size * 0.2, 0, 0);
    this.ctx.quadraticCurveTo(-p.size * 0.28, -p.size * 0.2, 0, -p.size * 0.75 + flicker);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawMusicNote(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.rotation * 0.3);
    this.ctx.globalAlpha = p.alpha * 0.75;
    this.ctx.fillStyle = '#FFD54F';
    this.ctx.shadowColor = '#FFB300';
    this.ctx.shadowBlur = 8;
    this.ctx.font = `${Math.floor(p.size * 1.4)}px Arial`;
    this.ctx.fillText('♪', 0, 0);
    this.ctx.restore();
  }

  drawDandiya(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.rotation);
    this.ctx.globalAlpha = p.alpha * 0.7;

    const len = p.size;
    const w = 2.5;

    // First stick (gold)
    this.ctx.save();
    this.ctx.rotate(Math.PI / 4);
    this.ctx.fillStyle = '#F59E0B';
    this.ctx.shadowColor = '#FBBF24';
    this.ctx.shadowBlur = 7;
    this.ctx.fillRect(-w / 2, -len / 2, w, len);
    // Tip ribbon
    this.ctx.fillStyle = '#EF4444';
    this.ctx.fillRect(-w / 2, -len / 2, w, 4);
    this.ctx.restore();

    // Second crossed stick
    this.ctx.save();
    this.ctx.rotate(-Math.PI / 4);
    this.ctx.fillStyle = '#FBBF24';
    this.ctx.fillRect(-w / 2, -len / 2, w, len);
    this.ctx.fillStyle = '#EF4444';
    this.ctx.fillRect(-w / 2, -len / 2, w, 4);
    this.ctx.restore();

    this.ctx.restore();
  }

  animate() {
    if (!this.isActive) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    // Update & draw background particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Oscillating sway
      p.oscillation += p.oscSpeed;
      p.x += p.vx + Math.sin(p.oscillation) * 0.4;
      p.y += p.vy;
      p.rotation += p.rotSpeed;

      // Draw by particle type
      if (p.type === 'sparkle') this.drawSparkle(p);
      else if (p.type === 'petal') this.drawPetal(p);
      else if (p.type === 'diya') this.drawDiya(p);
      else if (p.type === 'music') this.drawMusicNote(p);
      else if (p.type === 'dandiya') this.drawDandiya(p);

      // Boundary check & recycle
      const isDead = (p.vy > 0 && p.y > this.height + 25) || (p.vy < 0 && p.y < -30) || (p.x < -30) || (p.x > this.width + 30);
      if (isDead) {
        this.particles[i] = this.createRandomParticle(false);
      }
    }

    // Update & draw interactive touch sparks
    for (let i = this.touchParticles.length - 1; i >= 0; i--) {
      const tp = this.touchParticles[i];
      tp.x += tp.vx;
      tp.y += tp.vy;
      tp.alpha -= 0.025;

      if (tp.alpha <= 0) {
        this.touchParticles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = tp.alpha;
      this.ctx.fillStyle = tp.color;
      this.ctx.shadowColor = '#FFD700';
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(tp.x, tp.y, tp.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    requestAnimationFrame(() => this.animate());
  }
}

// Instantiate particle engine when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.festiveParticles = new FestiveParticleEngine('particle-canvas');
});
