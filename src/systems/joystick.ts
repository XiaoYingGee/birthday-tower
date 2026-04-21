import type { InputAction } from './input';

const REPEAT_DELAY = 200;
const REPEAT_INTERVAL = 120;

export class Joystick {
  private readonly container: HTMLElement;
  private readonly onAction: (action: InputAction) => void;
  private repeatTimer = 0;
  private repeatDelay = 0;

  constructor(container: HTMLElement, _knob: HTMLElement, onAction: (action: InputAction) => void) {
    this.container = container;
    this.onAction = onAction;

    this.container.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.container.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.container.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  destroy(): void {
    this.container.removeEventListener('touchstart', this.onTouchStart);
    this.container.removeEventListener('touchend', this.onTouchEnd);
    this.container.removeEventListener('touchcancel', this.onTouchEnd);
    this.stopRepeat();
  }

  private readonly onTouchStart = (e: TouchEvent): void => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-dir]');
    if (!btn) return;
    e.preventDefault();
    const dir = btn.dataset.dir as InputAction;
    btn.classList.add('pressed');
    this.onAction(dir);
    this.stopRepeat();
    this.repeatDelay = window.setTimeout(() => {
      this.repeatTimer = window.setInterval(() => this.onAction(dir), REPEAT_INTERVAL);
    }, REPEAT_DELAY);
  };

  private readonly onTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    this.container.querySelectorAll('.pressed').forEach((el) => el.classList.remove('pressed'));
    this.stopRepeat();
  };

  private stopRepeat(): void {
    if (this.repeatDelay) {
      window.clearTimeout(this.repeatDelay);
      this.repeatDelay = 0;
    }
    if (this.repeatTimer) {
      window.clearInterval(this.repeatTimer);
      this.repeatTimer = 0;
    }
  }
}
