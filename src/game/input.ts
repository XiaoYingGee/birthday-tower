export type InputAction = 'up' | 'down' | 'left' | 'right' | 'attack' | 'item';

const KEY_MAP: Record<string, InputAction | undefined> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  a: 'left',
  A: 'left',
  s: 'down',
  S: 'down',
  d: 'right',
  D: 'right',
  ' ': 'attack',
  e: 'item',
  E: 'item',
};

export class InputManager {
  private readonly onAction: (action: InputAction) => void;
  private readonly keyHandler: (event: KeyboardEvent) => void;
  private readonly releaseHandler: () => void;
  private activeButton?: HTMLButtonElement;
  private repeatTimer?: number;

  constructor(root: HTMLElement, onAction: (action: InputAction) => void) {
    this.onAction = onAction;
    this.keyHandler = (event) => {
      const action = KEY_MAP[event.key];
      if (!action) {
        return;
      }

      event.preventDefault();
      this.onAction(action);
    };

    this.releaseHandler = () => this.clearActiveButton();
    window.addEventListener('keydown', this.keyHandler, { passive: false });
    window.addEventListener('pointerup', this.releaseHandler);
    window.addEventListener('pointercancel', this.releaseHandler);

    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-action]'));
    for (const button of buttons) {
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        const action = button.dataset.action as InputAction;
        button.setPointerCapture(event.pointerId);
        this.setActiveButton(button, action);
      });

      button.addEventListener('pointerup', () => this.clearActiveButton());
      button.addEventListener('pointerleave', () => this.clearActiveButton());
      button.addEventListener('lostpointercapture', () => this.clearActiveButton());
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keyHandler);
    window.removeEventListener('pointerup', this.releaseHandler);
    window.removeEventListener('pointercancel', this.releaseHandler);
    this.clearActiveButton();
  }

  private setActiveButton(button: HTMLButtonElement, action: InputAction): void {
    this.clearActiveButton();
    this.activeButton = button;
    button.classList.add('pressed');
    this.onAction(action);

    if (action === 'up' || action === 'down' || action === 'left' || action === 'right') {
      this.repeatTimer = window.setInterval(() => this.onAction(action), 180);
    }
  }

  private clearActiveButton(): void {
    if (this.repeatTimer) {
      window.clearInterval(this.repeatTimer);
      this.repeatTimer = undefined;
    }

    if (this.activeButton) {
      this.activeButton.classList.remove('pressed');
      this.activeButton = undefined;
    }
  }
}
