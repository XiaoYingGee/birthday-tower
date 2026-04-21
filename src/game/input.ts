export type InputAction = 'up' | 'down' | 'left' | 'right';

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
};

export class InputManager {
  private readonly onAction: (action: InputAction) => void;
  private readonly keyHandler: (event: KeyboardEvent) => void;

  constructor(onAction: (action: InputAction) => void) {
    this.onAction = onAction;
    this.keyHandler = (event) => {
      const action = KEY_MAP[event.key];
      if (!action) return;
      event.preventDefault();
      this.onAction(action);
    };
    window.addEventListener('keydown', this.keyHandler, { passive: false });
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }
}
