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

function requireEl<T extends HTMLElement>(id: string): T {
  const el = document.querySelector<T>(`#${id}`);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

const canvas = requireEl<HTMLCanvasElement>('game-canvas');
const controls = requireEl<HTMLElement>('touch-controls');
const shell = requireEl<HTMLElement>('game-shell');
const messageEl = requireEl<HTMLElement>('message');
const bannerEl = requireEl<HTMLElement>('banner');
const leftPanel = requireEl<HTMLElement>('left-panel');
const rightPanel = requireEl<HTMLElement>('right-panel');
const shopOverlay = requireEl<HTMLElement>('shop-overlay');

const playerName = import.meta.env.VITE_PLAYER_NAME || '小朋友';
const playerAge = import.meta.env.VITE_PLAYER_AGE || '6';

async function bootstrap(): Promise<void> {
  messageEl.textContent = '素材加载中...';
  messageEl.classList.add('visible');

  const loader = new SpriteLoader();
  await loader.load();

  messageEl.classList.remove('visible');
  messageEl.textContent = '';

  const engine = new GameEngine({
    canvas,
    controls,
    shell,
    messageEl,
    bannerEl,
    leftPanel,
    rightPanel,
    shopOverlay,
    playerName,
    playerAge,
    loader,
  });

  window.addEventListener('beforeunload', () => engine.destroy());
}

void bootstrap();
