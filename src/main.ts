import './styles.css';

import { GameEngine } from './game/engine';
import { SpriteLoader } from './game/sprite-atlas';

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

const rootCanvas = canvas;
const rootControls = controls;
const rootShell = shell;
const rootMessageEl = messageEl;

const playerName = import.meta.env.VITE_PLAYER_NAME || '小朋友';
const playerAge = import.meta.env.VITE_PLAYER_AGE || '6';

async function bootstrap(): Promise<void> {
  rootMessageEl.textContent = '素材加载中...';
  rootMessageEl.classList.add('visible');

  const loader = new SpriteLoader();
  await loader.load();

  rootMessageEl.classList.remove('visible');
  rootMessageEl.textContent = '';

  const engine = new GameEngine({
    canvas: rootCanvas,
    controls: rootControls,
    shell: rootShell,
    messageEl: rootMessageEl,
    playerName,
    playerAge,
    loader,
  });

  window.addEventListener('beforeunload', () => engine.destroy());
}

void bootstrap();
