import './styles.css';

import { GameEngine } from './game/engine';

function blockMobileGestures(): void {
  const blocker = (event: Event) => event.preventDefault();
  document.addEventListener('gesturestart', blocker, { passive: false });
  document.addEventListener('gesturechange', blocker, { passive: false });
  document.addEventListener('gestureend', blocker, { passive: false });
  document.addEventListener('dblclick', blocker, { passive: false });
  document.addEventListener('contextmenu', blocker, { passive: false });
}

blockMobileGestures();

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const controls = document.querySelector<HTMLElement>('#touch-controls');
const shell = document.querySelector<HTMLElement>('#game-shell');
const messageEl = document.querySelector<HTMLElement>('#message');

if (!canvas || !controls || !shell || !messageEl) {
  throw new Error('Game root elements are missing.');
}

const playerName = import.meta.env.VITE_PLAYER_NAME || '小朋友';
const playerAge = import.meta.env.VITE_PLAYER_AGE || '6';

const engine = new GameEngine({
  canvas,
  controls,
  shell,
  messageEl,
  playerName,
  playerAge,
});

window.addEventListener('beforeunload', () => engine.destroy());
