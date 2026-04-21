import type { InputAction } from './input';

const DEAD_ZONE = 20;
const REPEAT_INTERVAL = 150;
const BASE_RADIUS = 70;
const KNOB_RADIUS = 30;

export class Joystick {
  private readonly base: HTMLElement;
  private readonly knob: HTMLElement;
  private readonly onAction: (action: InputAction) => void;
  private activeId: number | null = null;
  private repeatTimer = 0;
  private currentDir: InputAction | null = null;

  constructor(base: HTMLElement, knob: HTMLElement, onAction: (action: InputAction) => void) {
    this.base = base;
    this.knob = knob;
    this.onAction = onAction;

    this.base.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.base.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.base.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.base.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  destroy(): void {
    this.base.removeEventListener('touchstart', this.onTouchStart);
    this.base.removeEventListener('touchmove', this.onTouchMove);
    this.base.removeEventListener('touchend', this.onTouchEnd);
    this.base.removeEventListener('touchcancel', this.onTouchEnd);
    this.stopRepeat();
  }

  private readonly onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.activeId !== null) return;
    const touch = e.changedTouches[0];
    this.activeId = touch.identifier;
    this.updateFromTouch(touch);
  };

  private readonly onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = this.findTouch(e.changedTouches);
    if (touch) this.updateFromTouch(touch);
  };

  private readonly onTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.findTouch(e.changedTouches)) {
      this.activeId = null;
      this.knob.style.display = 'none';
      this.stopRepeat();
      this.currentDir = null;
    }
  };

  private findTouch(touches: TouchList): Touch | null {
    for (let i = 0; i < touches.length; i++) {
      if (touches[i].identifier === this.activeId) return touches[i];
    }
    return null;
  }

  private updateFromTouch(touch: Touch): void {
    const rect = this.base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = BASE_RADIUS - KNOB_RADIUS;

    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    this.knob.style.display = 'block';
    this.knob.style.left = `${rect.width / 2 + dx}px`;
    this.knob.style.top = `${rect.height / 2 + dy}px`;

    if (dist < DEAD_ZONE) {
      this.stopRepeat();
      this.currentDir = null;
      return;
    }

    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    let dir: InputAction;
    if (angle >= -45 && angle < 45) dir = 'right';
    else if (angle >= 45 && angle < 135) dir = 'down';
    else if (angle >= -135 && angle < -45) dir = 'up';
    else dir = 'left';

    if (dir !== this.currentDir) {
      this.currentDir = dir;
      this.stopRepeat();
      this.onAction(dir);
      this.repeatTimer = window.setInterval(() => this.onAction(dir), REPEAT_INTERVAL);
    }
  }

  private stopRepeat(): void {
    if (this.repeatTimer) {
      window.clearInterval(this.repeatTimer);
      this.repeatTimer = 0;
    }
  }
}
