import './styles.css';

import { GameEngine } from './core/engine';
import { SpriteLoader } from './render/sprite-atlas';
import { createDebugPanel } from './debug/debug';
import { ensurePlayerProfile, clearProfile } from './player-profile';

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

async function bootstrap(): Promise<void> {
  // 进入游戏前必须有玩家身份（姓名 + 年龄）。
  // 如果 localStorage 中已有，直接用；否则弹出入口 modal。
  const profile = await ensurePlayerProfile();
  const playerName = profile.name;
  const playerAge = String(profile.age);

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

  // PWA / 移动端关进程不一定触发 beforeunload，pagehide 是更可靠的信号
  window.addEventListener('pagehide', () => engine.destroy());

  // 页面隐藏时暂停音频，恢复时重启。10秒后仍隐藏则彻底销毁释放资源
  let hideTimer: number | undefined;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      engine.audio.pauseAll();
      hideTimer = window.setTimeout(() => {
        engine.audio.destroy();
      }, 10000);
    } else {
      if (hideTimer) {
        window.clearTimeout(hideTimer);
        hideTimer = undefined;
      }
      engine.audio.resumeAll();
    }
  });

  // 存档面板里的「修改我的资料」按钮：清 profile 后重新弹 modal，输入后刷新页面重新 bootstrap。
  // 重要：不动存档 `birthday-tower-save`。
  const editProfileBtn = document.querySelector<HTMLButtonElement>('#edit-profile-btn');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', async () => {
      clearProfile();
      saveOverlay.classList.remove('visible');
      await ensurePlayerProfile({ force: true });
      // 最简单可靠的做法：刷新页面使新姓名年龄生效于所有位置。
      window.location.reload();
    });
  }

  if (import.meta.env.DEV) {
    createDebugPanel(engine);
  }
}

void bootstrap();
