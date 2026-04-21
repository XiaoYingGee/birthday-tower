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

function setupLandscapeHint(): void {
  if (!matchMedia('(pointer: coarse)').matches) return;
  const hint = document.createElement('div');
  hint.id = 'landscape-hint';
  hint.innerHTML = '<div class="landscape-icon">📱↻</div><div>请旋转设备至横屏模式</div>';
  document.body.appendChild(hint);
  const check = () => {
    hint.classList.toggle('visible', window.innerHeight > window.innerWidth);
  };
  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', check);
  check();
}

setupLandscapeHint();

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
const rightPanel = requireEl<HTMLElement>('right-panel');
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

const dpadSideBtn = document.getElementById('dpad-side-btn');
if (dpadSideBtn) {
  let dpadOnRight = true;
  dpadSideBtn.addEventListener('click', () => {
    dpadOnRight = !dpadOnRight;
    if (dpadOnRight) {
      dpad.style.right = '20px';
      dpad.style.left = 'auto';
    } else {
      dpad.style.right = 'auto';
      dpad.style.left = '20px';
    }
  });
}

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
    joystickBase: dpad,
    joystickKnob: dpad,
    shell,
    messageEl,
    bannerEl,
    rightPanel,
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
