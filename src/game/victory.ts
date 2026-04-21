interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

export class VictoryEffect {
  private readonly overlay: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly replayButton: HTMLButtonElement;
  private readonly onReplay: () => void;
  private readonly particles: Particle[] = [];
  private rafId = 0;
  private lastFrame = 0;
  private lastBurst = 0;
  private startedAt = 0;
  private active = false;

  constructor(shell: HTMLElement, playerName: string, playerAge: string, onReplay: () => void) {
    this.onReplay = onReplay;

    this.overlay = document.createElement('div');
    this.overlay.className = 'victory-overlay';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'victory-canvas';
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create victory canvas context.');
    }
    this.ctx = ctx;

    const content = document.createElement('div');
    content.className = 'victory-content';
    content.innerHTML = `
      <h1>🎂 生日快乐 🎂</h1>
      <p>祝 ${playerName} ${playerAge} 岁生日快乐！</p>
      <div class="victory-emoji">🎂 🎁 🎈</div>
    `;

    this.replayButton = document.createElement('button');
    this.replayButton.className = 'victory-replay';
    this.replayButton.textContent = '再玩一次';
    this.replayButton.hidden = true;
    this.replayButton.addEventListener('click', () => {
      this.hide();
      this.onReplay();
    });
    content.appendChild(this.replayButton);

    this.overlay.append(this.canvas, content);
    shell.appendChild(this.overlay);

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  show(): void {
    this.startedAt = performance.now();
    this.lastFrame = this.startedAt;
    this.lastBurst = 0;
    this.active = true;
    this.replayButton.hidden = true;
    this.overlay.classList.add('visible');
    this.loop(this.startedAt);
  }

  hide(): void {
    this.active = false;
    this.overlay.classList.remove('visible');
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.particles.length = 0;
  }

  destroy(): void {
    this.hide();
    window.removeEventListener('resize', this.resize);
    this.overlay.remove();
  }

  private readonly resize = (): void => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  };

  private loop = (now: number): void => {
    if (!this.active) {
      return;
    }

    const delta = Math.min(32, now - this.lastFrame);
    this.lastFrame = now;
    const elapsed = now - this.startedAt;

    if (elapsed - this.lastBurst > 450) {
      this.spawnBurst();
      this.lastBurst = elapsed;
    }

    this.updateParticles(delta / 16.67);
    this.renderParticles();

    if (elapsed >= 8000) {
      this.replayButton.hidden = false;
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private spawnBurst(): void {
    const colors = ['#ffd166', '#ff7b72', '#80ed99', '#7bdff2', '#c77dff'];
    const burstX = 80 + Math.random() * Math.max(120, this.canvas.width - 160);
    const burstY = 80 + Math.random() * Math.max(120, this.canvas.height * 0.45);

    for (let i = 0; i < 32; i += 1) {
      const angle = (Math.PI * 2 * i) / 32;
      const speed = 1.8 + Math.random() * 2.4;
      this.particles.push({
        x: burstX,
        y: burstY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        life: 1,
        size: 3 + Math.random() * 4,
        color: colors[i % colors.length],
      });
    }
  }

  private updateParticles(delta: number): void {
    for (const particle of this.particles) {
      particle.x += particle.vx * delta * 3;
      particle.y += particle.vy * delta * 3;
      particle.vy += 0.08 * delta;
      particle.life -= 0.018 * delta;
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private renderParticles(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const particle of this.particles) {
      this.ctx.globalAlpha = Math.max(0, particle.life);
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }
}
