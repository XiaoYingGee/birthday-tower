import './styles.css';

import { GameEngine } from './core/engine';
import { SpriteLoader } from './render/sprite-atlas';
import { createDebugPanel } from './debug/debug';

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
const dpad = requireEl<HTMLElement>('dpad');
const shell = requireEl<HTMLElement>('game-shell');
const messageEl = requireEl<HTMLElement>('message');
const bannerEl = requireEl<HTMLElement>('banner');
const leftPanel = requireEl<HTMLElement>('left-panel');
const shopOverlay = requireEl<HTMLElement>('shop-overlay');
const princessOverlay = requireEl<HTMLElement>('princess-overlay');
const keyshopOverlay = requireEl<HTMLElement>('keyshop-overlay');
const battleConfirm = requireEl<HTMLElement>('battle-confirm');
const deathOverlay = requireEl<HTMLElement>('death-overlay');
const restartBtn = requireEl<HTMLElement>('restart-btn');
const restartConfirm = requireEl<HTMLElement>('restart-confirm');
const treasureConfirm = requireEl<HTMLElement>('treasure-confirm');
const fairyConfirm = requireEl<HTMLElement>('fairy-confirm');
const victoryChest = requireEl<HTMLElement>('victory-chest');
const saveBtn = requireEl<HTMLElement>('save-btn');
const saveOverlay = requireEl<HTMLElement>('save-overlay');
const muteBtn = requireEl<HTMLElement>('mute-btn');

const playerName = import.meta.env.VITE_PLAYER_NAME || '吴沐峰';
const playerAge = import.meta.env.VITE_PLAYER_AGE || '10';

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
    joystickBase: dpad,
    joystickKnob: dpad,
    shell,
    messageEl,
    bannerEl,
    leftPanel,
    shopOverlay,
    princessOverlay,
    keyshopOverlay,
    battleConfirm,
    deathOverlay,
    restartBtn,
    restartConfirm,
    treasureConfirm,
    fairyConfirm,
    victoryChest,
    saveBtn,
    saveOverlay,
    muteBtn,
    playerName,
    playerAge,
    loader,
  });

  window.addEventListener('beforeunload', () => engine.destroy());

  if (import.meta.env.DEV) {
    createDebugPanel(engine);
  }
}

void bootstrap();
