import type { Cell } from '../data/floor';
import type { GameContext } from '../core/game-context';
import { CONFIG } from '../data/config';

export interface ShopHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
}

export function createShop(overlay: HTMLElement, ctx: GameContext): ShopHandle {
  let open = false;

  const shopLabels: Record<string, string> = { hp: 'HP', atk: '攻', def: '防' };
  const btns = overlay.querySelectorAll<HTMLButtonElement>('[data-shop]');
  for (const btn of btns) {
    const action = btn.dataset.shop! as 'hp' | 'atk' | 'def';
    const item = CONFIG.shop[action];
    if (item) btn.textContent = `${shopLabels[action]}+${item.gain} (${item.cost}金)`;
  }

  overlay.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>('[data-shop]');
    if (!btn) {
      if (target.closest('.shop-close')) {
        handle.close();
      }
      return;
    }

    const action = btn.dataset.shop! as 'hp' | 'atk' | 'def';
    const shopItem = CONFIG.shop[action];
    if (!shopItem || ctx.player.gold < shopItem.cost) return;

    ctx.player.gold -= shopItem.cost;
    if (action === 'hp') { ctx.player.hp += shopItem.gain; }
    else if (action === 'atk') { ctx.player.atk += shopItem.gain; }
    else if (action === 'def') { ctx.player.def += shopItem.gain; }
    ctx.showMessage(`${action === 'hp' ? 'HP' : action === 'atk' ? '攻' : '防'}+${shopItem.gain}`);

    updateButtons();
    ctx.save();
  });

  function updateButtons(): void {
    const gold = ctx.player.gold;
    const allBtns = overlay.querySelectorAll<HTMLButtonElement>('[data-shop]');
    for (const btn of allBtns) {
      const action = btn.dataset.shop! as 'hp' | 'atk' | 'def';
      const shopItem = CONFIG.shop[action];
      btn.disabled = !shopItem || gold < shopItem.cost;
    }
    const goldEl = overlay.querySelector('.shop-gold');
    if (goldEl) goldEl.textContent = `金币: ${gold}`;
  }

  const handle: ShopHandle = {
    open() {
      open = true;
      updateButtons();
      overlay.classList.add('visible');
    },
    close() {
      open = false;
      overlay.classList.remove('visible');
    },
    isOpen() { return open; },
  };

  return handle;
}

export interface PrincessHandle {
  open(cell: Cell): void;
  close(): void;
  isOpen(): boolean;
}

export function createPrincess(overlay: HTMLElement, ctx: GameContext): PrincessHandle {
  let open = false;
  let activeCell: Cell | undefined;

  overlay.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-princess]');
    if (!btn) return;
    const action = btn.dataset.princess! as 'hp' | 'atk' | 'def';
    if (action === 'hp') { ctx.player.hp += 200; ctx.showMessage('HP +200'); }
    else if (action === 'atk') { ctx.player.atk += 40; ctx.showMessage('攻击 +40'); }
    else if (action === 'def') { ctx.player.def += 20; ctx.showMessage('防御 +20'); }
    if (activeCell) {
      activeCell.princess = undefined;
      activeCell = undefined;
    }
    open = false;
    overlay.classList.remove('visible');
    ctx.save();
  });

  return {
    open(cell: Cell) {
      open = true;
      activeCell = cell;
      overlay.classList.add('visible');
    },
    close() {
      open = false;
      activeCell = undefined;
      overlay.classList.remove('visible');
    },
    isOpen() { return open; },
  };
}

export interface KeyShopHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
}

const KEY_COST = 100;
const KEY_LIMIT = 5;

export function createKeyShop(overlay: HTMLElement, ctx: GameContext): KeyShopHandle {
  let open = false;
  let sold = 0;

  const keyMap: Record<string, 'yellowKeys' | 'blueKeys' | 'redKeys'> = {
    yellow: 'yellowKeys',
    blue: 'blueKeys',
    red: 'redKeys',
  };

  overlay.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>('[data-keyshop]');
    if (!btn) {
      if (target.closest('.shop-close')) {
        handle.close();
      }
      return;
    }

    const color = btn.dataset.keyshop!;
    const key = keyMap[color];
    if (!key || ctx.player.gold < KEY_COST || sold >= KEY_LIMIT) return;

    ctx.player.gold -= KEY_COST;
    ctx.player[key] += 1;
    sold += 1;

    const names: Record<string, string> = { yellow: '黄', blue: '蓝', red: '红' };
    ctx.showMessage(`购买${names[color]}钥匙！剩余${KEY_LIMIT - sold}次`);
    updateButtons();
    ctx.save();
  });

  function updateButtons(): void {
    const gold = ctx.player.gold;
    const allBtns = overlay.querySelectorAll<HTMLButtonElement>('[data-keyshop]');
    for (const btn of allBtns) {
      btn.disabled = gold < KEY_COST || sold >= KEY_LIMIT;
    }
    const goldEl = overlay.querySelector('.shop-gold');
    if (goldEl) goldEl.textContent = `金币: ${gold}`;
    const remainEl = overlay.querySelector('.keyshop-remain');
    if (remainEl) remainEl.textContent = `剩余: ${KEY_LIMIT - sold}`;
  }

  const handle: KeyShopHandle = {
    open() {
      open = true;
      updateButtons();
      overlay.classList.add('visible');
    },
    close() {
      open = false;
      overlay.classList.remove('visible');
    },
    isOpen() { return open; },
  };

  return handle;
}
