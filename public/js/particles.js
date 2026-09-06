const PARTICLE_COLORS = ['rgba(56,189,248,0.35)', 'rgba(99,102,241,0.25)', 'rgba(244,114,182,0.2)', 'rgba(251,191,36,0.15)'];

class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.shapes = [];
    this.running = true;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.init();
    this.loop();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    this.particles = [];
    this.shapes = [];
    const count = Math.min(45, Math.floor(window.innerWidth / 28));
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.5 + 0.3,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.015,
      });
    }
    for (let i = 0; i < 4; i++) {
      this.shapes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        size: Math.random() * 60 + 30,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)].replace(/[\d.]+\)$/, '0.04)'),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.003,
        type: Math.floor(Math.random() * 3),
      });
    }
  }

  loop() {
    if (!this.running) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.shapes.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;
      s.rotation += s.rotSpeed;
      if (s.x < -s.size) s.x = this.canvas.width + s.size;
      if (s.x > this.canvas.width + s.size) s.x = -s.size;
      if (s.y < -s.size) s.y = this.canvas.height + s.size;
      if (s.y > this.canvas.height + s.size) s.y = -s.size;

      this.ctx.save();
      this.ctx.translate(s.x, s.y);
      this.ctx.rotate(s.rotation);
      this.ctx.fillStyle = s.color;

      if (s.type === 0) {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, s.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (s.type === 1) {
        this.ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
      } else {
        this.ctx.beginPath();
        this.ctx.moveTo(0, -s.size / 2);
        this.ctx.lineTo(s.size / 2, s.size / 2);
        this.ctx.lineTo(-s.size / 2, s.size / 2);
        this.ctx.closePath();
        this.ctx.fill();
      }
      this.ctx.restore();
    });

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += p.pulseSpeed;
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      const alpha = 0.4 + Math.sin(p.pulse) * 0.25;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${alpha})`);
      this.ctx.fill();
    });

    requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
  }
}
