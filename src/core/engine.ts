import { createFloors } from '../data/floors';
import type { Cell, FloorDefinition } from '../data/floor';
import { InputManager, type InputAction } from '../systems/input';
import { Joystick } from '../systems/joystick';
import { applyItem, consumeDoorKey, createPlayer, type PlayerState } from '../entities/player';
import { Renderer, type FloatingTextRenderState } from '../render/renderer';
import { saveGame, loadGame, clearSave, saveToSlot, loadFromSlot, getSlotInfo } from './save';
import { TILE_SIZE, type SpriteLoader } from '../render/sprite-atlas';
import { VictoryEffect } from '../render/victory';
import { CONFIG } from '../data/config';
import type { GameContext } from './game-context';
import { setupModalKeyboard } from '../systems/modal-keyboard';
import { setupTapInspect } from '../systems/tap-inspect';
import { startMove, updateMovement, type MoveAnimation } from '../systems/movement';
import { resolveCellArrival } from '../systems/floor-nav';
import { createShop, createPrincess, createKeyShop, type ShopHandle, type PrincessHandle, type KeyShopHandle } from '../entities/npc';
import { tryStartBattle, executeBattle, updateBattleAnimation, finishBattle, getBattleRenderState, type BattleAnimation } from '../systems/battle';

type Direction = InputAction;

interface FloatingText {
  text: string;
  x: number;
  y: number;
  rise: number;
  color: string;
  start: number;
  duration: number;
}

export interface GameConfig {
  canvas: HTMLCanvasElement;
  controls: HTMLElement;
  joystickBase: HTMLElement;
  joystickKnob: HTMLElement;
  shell: HTMLElement;
  messageEl: HTMLElement;
  bannerEl: HTMLElement;
  leftPanel: HTMLElement;
  shopOverlay: HTMLElement;
  princessOverlay: HTMLElement;
  keyshopOverlay: HTMLElement;
  battleConfirm: HTMLElement;
  deathOverlay: HTMLElement;
  restartBtn: HTMLElement;
  restartConfirm: HTMLElement;
  treasureConfirm: HTMLElement;
  fairyConfirm: HTMLElement;
  victoryChest: HTMLElement;
  saveBtn: HTMLElement;
  saveOverlay: HTMLElement;
  playerName: string;
  playerAge: string;
  loader: SpriteLoader;
}

export class GameEngine implements GameContext {
  private readonly renderer: Renderer;
  private readonly input: InputManager;
  private readonly joystick: Joystick;
  private readonly victory: VictoryEffect;
  private readonly shop: ShopHandle;
  private readonly princess: PrincessHandle;
  private readonly keyShop: KeyShopHandle;
  private readonly battleConfirm: HTMLElement;
  private readonly deathOverlay: HTMLElement;
  private readonly restartConfirm: HTMLElement;
  private readonly restartBtn: HTMLElement;
  private readonly treasureConfirm: HTMLElement;
  private readonly fairyConfirm: HTMLElement;
  private readonly victoryChest: HTMLElement;
  readonly playerName: string;
  private readonly destroyModalKb: () => void;

  floors: FloorDefinition[] = [];
  floorIndex = 0;
  player!: PlayerState;
  private message = '';
  private messageTimer?: number;
  private victoryShown = false;
  private pendingTreasureCell?: Cell;
  private pendingFairyCell?: Cell;
  private pendingDirection?: Direction;
  private pendingBattle?: { cell: Cell; x: number; y: number; direction: Direction };
  private moveAnimation?: MoveAnimation;
  private battleAnimation?: BattleAnimation;
  private floatingTexts: FloatingText[] = [];
  private rafId = 0;
  private lastFrame = 0;

  get currentFloor(): FloorDefinition {
    return this.floors[this.floorIndex];
  }

  constructor(config: GameConfig) {
    this.renderer = new Renderer(config.canvas, config.messageEl, config.bannerEl, config.leftPanel, config.loader);
    this.input = new InputManager((action) => this.handleAction(action));
    this.joystick = new Joystick(config.joystickBase, config.joystickKnob, (action) => this.handleAction(action));
    this.victory = new VictoryEffect(config.shell, config.playerName, config.playerAge, () => this.newGame());
    this.battleConfirm = config.battleConfirm;
    this.deathOverlay = config.deathOverlay;
    this.restartBtn = config.restartBtn;
    this.restartConfirm = config.restartConfirm;
    this.treasureConfirm = config.treasureConfirm;
    this.fairyConfirm = config.fairyConfirm;
    this.victoryChest = config.victoryChest;
    this.playerName = config.playerName;

    this.shop = createShop(config.shopOverlay, this);
    this.princess = createPrincess(config.princessOverlay, this);
    this.keyShop = createKeyShop(config.keyshopOverlay, this);
    this.setupBattleConfirm();
    this.setupDeathOverlay();
    this.setupRestartBtn();
    this.setupTreasureConfirm();
    this.setupFairyConfirm();
    this.setupVictoryChest();
    this.setupSaveOverlay(config.saveBtn, config.saveOverlay);
    setupTapInspect(config.canvas, this.renderer, this);
    this.destroyModalKb = setupModalKeyboard([
      config.shopOverlay, config.princessOverlay, config.keyshopOverlay,
      config.battleConfirm, config.deathOverlay, config.restartConfirm,
      config.treasureConfirm, config.fairyConfirm, config.saveOverlay,
    ]);

    this.initGame();
    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    this.renderer.destroy();
    this.input.destroy();
    this.joystick.destroy();
    this.victory.destroy();
    this.destroyModalKb();
    if (this.messageTimer) {
      window.clearTimeout(this.messageTimer);
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  // --- UI Setup ---

  private setupBattleConfirm(): void {
    this.battleConfirm.querySelector('.confirm-yes')!.addEventListener('click', () => {
      if (!this.pendingBattle) return;
      const pb = this.pendingBattle;
      this.pendingBattle = undefined;
      this.battleConfirm.classList.remove('visible');
      this.battleAnimation = executeBattle(this, pb.cell, pb.x, pb.y, pb.direction);
    });
    this.battleConfirm.querySelector('.confirm-no')!.addEventListener('click', () => {
      this.pendingBattle = undefined;
      this.battleConfirm.classList.remove('visible');
    });
  }

  private setupDeathOverlay(): void {
    this.deathOverlay.querySelector('.death-restart')!.addEventListener('click', () => {
      this.deathOverlay.classList.remove('visible');
      this.newGame();
    });
  }

  private setupRestartBtn(): void {
    let pressTimer: number | undefined;
    let elapsed = 0;
    let interval: number | undefined;
    const HOLD_DURATION = 5000;
    const btn = this.restartBtn;

    const startHold = () => {
      elapsed = 0;
      btn.textContent = '5';
      btn.style.background = 'rgba(255,80,60,0.3)';
      interval = window.setInterval(() => {
        elapsed += 100;
        const remaining = Math.ceil((HOLD_DURATION - elapsed) / 1000);
        btn.textContent = String(remaining);
        if (elapsed >= HOLD_DURATION) {
          cancelHold();
          btn.textContent = '↺';
          btn.style.background = '';
          requestAnimationFrame(() => {
            this.restartConfirm.classList.add('visible');
          });
        }
      }, 100);
    };

    const cancelHold = () => {
      if (interval) { clearInterval(interval); interval = undefined; }
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = undefined; }
      btn.textContent = '↺';
      btn.style.background = '';
    };

    const showTip = () => {
      this.showMessage('长按5秒重启游戏');
    };

    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); startHold(); });
    btn.addEventListener('pointerup', () => { if (elapsed < HOLD_DURATION) showTip(); cancelHold(); });
    btn.addEventListener('pointerleave', () => { cancelHold(); });
    btn.addEventListener('pointercancel', () => { cancelHold(); });

    this.restartConfirm.querySelector('.restart-yes')!.addEventListener('click', () => {
      this.restartConfirm.classList.remove('visible');
      this.newGame();
    });
    this.restartConfirm.querySelector('.restart-no')!.addEventListener('click', () => {
      this.restartConfirm.classList.remove('visible');
    });
  }

  private setupTreasureConfirm(): void {
    this.treasureConfirm.querySelector('.treasure-yes')!.addEventListener('click', () => {
      if (!this.pendingTreasureCell) return;
      const cell = this.pendingTreasureCell;
      this.pendingTreasureCell = undefined;
      this.treasureConfirm.classList.remove('visible');
      const item = cell.item!;
      cell.item = undefined;
      this.showMessage(applyItem(this.player, item));
      this.save();
    });
    this.treasureConfirm.querySelector('.treasure-no')!.addEventListener('click', () => {
      this.pendingTreasureCell = undefined;
      this.treasureConfirm.classList.remove('visible');
    });
  }

  private setupFairyConfirm(): void {
    this.fairyConfirm.querySelector('.fairy-yes')!.addEventListener('click', () => {
      if (!this.pendingFairyCell) return;
      const cell = this.pendingFairyCell;
      this.pendingFairyCell = undefined;
      this.fairyConfirm.classList.remove('visible');
      const hpGain = Math.ceil(this.player.hp * 0.5);
      const atkGain = Math.ceil(this.player.atk * 0.5);
      const defGain = Math.ceil(this.player.def * 0.5);
      this.player.hp += hpGain;
      this.player.atk += atkGain;
      this.player.def += defGain;
      cell.fairy = undefined;
      this.showMessage(`仙子的祝福：HP+${hpGain} 攻+${atkGain} 防+${defGain}`);
      this.save();
    });
    this.fairyConfirm.querySelector('.fairy-no')!.addEventListener('click', () => {
      this.pendingFairyCell = undefined;
      this.fairyConfirm.classList.remove('visible');
    });
  }

  private setupSaveOverlay(saveBtnEl: HTMLElement, overlay: HTMLElement): void {
    const slotsEl = overlay.querySelector('.save-slots')!;
    const closeBtn = overlay.querySelector('.save-close')!;

    const renderSlots = () => {
      slotsEl.innerHTML = '';
      for (let i = 1; i <= 3; i++) {
        const info = getSlotInfo(i);
        const slot = document.createElement('div');
        slot.className = 'save-slot';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'save-slot-info';
        const label = document.createElement('div');
        label.className = 'slot-label';
        label.textContent = `存档 ${i}`;
        infoDiv.appendChild(label);
        if (info.exists) {
          const detail = document.createElement('div');
          detail.className = 'slot-detail';
          const time = info.timestamp ? new Date(info.timestamp).toLocaleString() : '';
          detail.textContent = `${this.playerName} Lv.${info.level} F${(info.floorIndex ?? 0) + 1} ${time}`;
          infoDiv.appendChild(detail);
        } else {
          const detail = document.createElement('div');
          detail.className = 'slot-detail';
          detail.textContent = '空';
          infoDiv.appendChild(detail);
        }

        const actions = document.createElement('div');
        actions.className = 'save-slot-actions';
        const saveBtn = document.createElement('button');
        saveBtn.className = 'slot-save-btn';
        saveBtn.textContent = '保存';
        saveBtn.addEventListener('click', () => {
          saveToSlot(i, this.floorIndex, this.player, this.floors);
          this.showMessage(`已保存到存档 ${i}`);
          renderSlots();
        });
        const loadBtn = document.createElement('button');
        loadBtn.className = 'slot-load-btn';
        loadBtn.textContent = '读取';
        loadBtn.disabled = !info.exists;
        loadBtn.addEventListener('click', () => {
          this.reset();
          const result = loadFromSlot(i, this.floors, this.player);
          if (result) {
            this.floorIndex = result.floorIndex;
            saveGame(this.floorIndex, this.player, this.floors);
            this.showMessage(`已读取存档 ${i}`);
          }
          overlay.classList.remove('visible');
        });
        actions.append(saveBtn, loadBtn);
        slot.append(infoDiv, actions);
        slotsEl.appendChild(slot);
      }
    };

    saveBtnEl.addEventListener('click', () => {
      renderSlots();
      overlay.classList.add('visible');
    });
    closeBtn.addEventListener('click', () => { overlay.classList.remove('visible'); });
  }

  private setupVictoryChest(): void {
    this.victoryChest.addEventListener('click', () => {
      this.victoryChest.classList.remove('visible');
      this.victory.show();
    });
  }

  // --- Game State ---

  private reset(): void {
    if (this.messageTimer) {
      window.clearTimeout(this.messageTimer);
      this.messageTimer = undefined;
    }

    this.floors = createFloors();
    this.floorIndex = 0;
    const start = this.floors[0].start;
    this.player = createPlayer(start.x, start.y);
    this.message = '';
    this.victoryShown = false;
    this.shop.close();
    this.princess.close();
    this.keyShop.close();
    this.battleConfirm.classList.remove('visible');
    this.deathOverlay.classList.remove('visible');
    this.treasureConfirm.classList.remove('visible');
    this.fairyConfirm.classList.remove('visible');
    this.victoryChest.classList.remove('visible');
    this.pendingDirection = undefined;
    this.pendingBattle = undefined;
    this.pendingTreasureCell = undefined;
    this.pendingFairyCell = undefined;
    this.moveAnimation = undefined;
    this.battleAnimation = undefined;
    this.floatingTexts = [];
  }

  private initGame(): void {
    this.reset();
    const saved = loadGame(this.floors, this.player);
    if (saved) {
      this.floorIndex = saved.floorIndex;
      this.message = '';
    } else {
    }
  }

  private newGame(): void {
    clearSave();
    this.reset();
  }

  save(): void {
    saveGame(this.floorIndex, this.player, this.floors);
  }

  // --- Game Loop ---

  private readonly loop = (now: number): void => {
    const delta = Math.min(40, now - this.lastFrame);
    this.lastFrame = now;
    this.update(now, delta);
    this.render(now);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(now: number, delta: number): void {
    if (this.moveAnimation) {
      const done = updateMovement(this.player, this.moveAnimation, now, delta);
      if (done) {
        this.moveAnimation = undefined;
        const cell = this.currentFloor.grid[this.player.y][this.player.x];
        if (cell.item === 'treasure') {
          this.pendingTreasureCell = cell;
          this.treasureConfirm.classList.add('visible');
        } else {
          resolveCellArrival(this, cell);
          this.tryConsumePendingDirection();
        }
      }
    }

    if (this.battleAnimation) {
      const done = updateBattleAnimation(this.battleAnimation, now, this.player.dir);
      if (done) {
        const battle = this.battleAnimation;
        this.battleAnimation = undefined;
        finishBattle(this, battle, {
          onVictory: () => {
            this.victoryShown = true;
            window.setTimeout(() => {
              this.victoryChest.classList.add('visible');
            }, 500);
          },
          onDeath: (name) => {
            const body = this.deathOverlay.querySelector('.death-body')!;
            body.innerHTML = `<div>被 ${name} 击败</div>`;
            this.deathOverlay.classList.add('visible');
          },
          onCellArrival: () => {
            resolveCellArrival(this, this.currentFloor.grid[this.player.y][this.player.x]);
          },
          onPendingInput: () => this.tryConsumePendingDirection(),
        });
      }
    }

    this.floatingTexts = this.floatingTexts.filter((ft) => now - ft.start < ft.duration);
  }

  private render(now: number): void {
    this.renderer.render({
      now,
      floorNumber: this.floorIndex + 1,
      floorName: this.currentFloor.name,
      floor: this.currentFloor,
      player: this.player,
      playerName: this.playerName,
      message: this.message,
      floatingTexts: this.getFloatingTextRenderState(now),
      battle: getBattleRenderState(this.battleAnimation),
    });
  }

  // --- Input ---

  private handleAction(action: InputAction): void {
    if (this.victoryShown || this.shop.isOpen() || this.princess.isOpen() || this.keyShop.isOpen() || this.pendingBattle || this.pendingTreasureCell || this.pendingFairyCell || this.restartConfirm.classList.contains('visible')) {
      return;
    }
    if (this.player.isMoving) {
      this.pendingDirection = action;
      return;
    }
    if (this.battleAnimation) return;
    this.tryMove(action);
  }

  private tryMove(direction: Direction): void {
    const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0;
    const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
    this.player.dir = direction;
    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;
    const cell = this.currentFloor.grid[nextY]?.[nextX];

    if (!cell || cell.terrain === 'wall') return;

    if (cell.door) {
      if (!consumeDoorKey(this.player, cell.door)) {
        this.showMessage('钥匙不够');
        return;
      }
      cell.door = undefined;
      this.showMessage('开门');
      this.save();
      return;
    }

    if (cell.monster) {
      const result = tryStartBattle(this, cell, nextX, nextY, this.battleConfirm);
      if (result.type === 'pending') {
        this.pendingBattle = { cell: result.cell, x: result.x, y: result.y, direction };
      } else {
        this.battleAnimation = executeBattle(this, cell, nextX, nextY, direction);
      }
      return;
    }

    if (cell.merchant) { this.shop.open(); return; }
    if (cell.princess) { this.princess.open(cell); return; }
    if (cell.fairy) {
      this.pendingFairyCell = cell;
      const hpGain = Math.ceil(this.player.hp * 0.5);
      const atkGain = Math.ceil(this.player.atk * 0.5);
      const defGain = Math.ceil(this.player.def * 0.5);
      const body = this.fairyConfirm.querySelector('.fairy-body')!;
      body.textContent = `HP+${hpGain} 攻+${atkGain} 防+${defGain}`;
      this.fairyConfirm.classList.add('visible');
      return;
    }
    if (cell.keyShop) { this.keyShop.open(); return; }

    this.moveAnimation = startMove(this.player, nextX, nextY, performance.now());
  }

  private tryConsumePendingDirection(): void {
    if (!this.pendingDirection || this.player.isMoving || this.battleAnimation || this.victoryShown) return;
    const next = this.pendingDirection;
    this.pendingDirection = undefined;
    this.tryMove(next);
  }

  // --- GameContext ---

  showMessage(text: string): void {
    this.message = text;
    if (this.messageTimer) window.clearTimeout(this.messageTimer);
    this.messageTimer = window.setTimeout(() => { this.message = ''; }, CONFIG.timing.messageDuration);
  }

  addFloatingText(text: string, x: number, y: number, color: string, start: number, duration: number): void {
    this.floatingTexts.push({ text, x, y, rise: 30, color, start, duration });
  }

  placePlayer(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
    this.player.visualX = x * TILE_SIZE;
    this.player.visualY = y * TILE_SIZE;
    this.player.walkFrame = 0;
    this.player.walkFrameTimer = 0;
    this.player.isMoving = false;
  }

  private getFloatingTextRenderState(now: number): FloatingTextRenderState[] {
    return this.floatingTexts.map((ft) => {
      const progress = Math.min(1, (now - ft.start) / ft.duration);
      return { text: ft.text, x: ft.x, y: ft.y - ft.rise * progress, color: ft.color, alpha: 1 - progress };
    });
  }

  // --- Debug ---

  debugResetFloor(index: number, preset?: { hp: number; atk: number; def: number; gold: number; exp: number; level: number; yellowKeys: number; blueKeys: number; redKeys: number }, startPos?: { x: number; y: number }): void {
    if (index < 0 || index >= this.floors.length) return;
    const fresh = createFloors();
    this.floors[index] = fresh[index];
    this.floorIndex = index;
    const pos = startPos || this.currentFloor.start;
    this.placePlayer(pos.x, pos.y);
    if (preset) {
      Object.assign(this.player, preset);
    }
    this.pendingDirection = undefined;
    this.pendingBattle = undefined;
    this.moveAnimation = undefined;
    this.battleAnimation = undefined;
    this.showMessage(`重置 F${index + 1}`);
    this.save();
  }

  debugGoToFloor(index: number): void {
    if (index < 0 || index >= this.floors.length) return;
    this.floorIndex = index;
    this.placePlayer(this.currentFloor.start.x, this.currentFloor.start.y);
    this.pendingDirection = undefined;
    this.pendingBattle = undefined;
    this.moveAnimation = undefined;
    this.battleAnimation = undefined;
    this.showMessage(`跳转到 F${index + 1}`);
    this.save();
  }

  debugAdjustPlayer(key: string, delta: number): void {
    const p = this.player as any;
    if (typeof p[key] === 'number') p[key] = Math.max(0, p[key] + delta);
  }

  debugSetPlayer(key: string, value: number): void {
    const p = this.player as any;
    if (typeof p[key] === 'number') p[key] = value;
  }

  debugAdjustMonster(id: string, stat: 'hp' | 'atk' | 'def' | 'gold' | 'exp', delta: number): void {
    const m = CONFIG.monsters[id as keyof typeof CONFIG.monsters];
    if (m) (m as any)[stat] = Math.max(1, m[stat] + delta);
  }

  debugGetPlayer(): PlayerState | undefined {
    return this.player;
  }
}
