import { createFloors } from './floors';
import type { Cell, FloorDefinition, MonsterId } from './floor';
import { InputManager, type InputAction } from './input';
import { Joystick } from './joystick';
import { estimateBattle, MONSTERS, type BattleEstimate } from './monster';
import { applyItem, checkLevelUp, consumeDoorKey, createPlayer, type PlayerState } from './player';
import { Renderer, type BattleRenderState, type FloatingTextRenderState, type MonsterInfo, type SpriteRef } from './renderer';
import { saveGame, loadGame, clearSave } from './save';
import { TILE_SIZE, ATLAS, type SpriteLoader } from './sprite-atlas';
import { VictoryEffect } from './victory';
import { CONFIG } from './config';

type Direction = InputAction;

interface MoveAnimation {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  targetGridX: number;
  targetGridY: number;
  start: number;
  duration: number;
}

interface FloatingText {
  text: string;
  x: number;
  y: number;
  rise: number;
  color: string;
  start: number;
  duration: number;
}

interface BattleAnimation {
  start: number;
  duration: number;
  gridX: number;
  gridY: number;
  monsterId: MonsterId;
  estimate: BattleEstimate;
  playerDashX: number;
  playerDashY: number;
  monsterShakeX: number;
  monsterShakeY: number;
  monsterFlashAlpha: number;
}

export interface GameConfig {
  canvas: HTMLCanvasElement;
  controls: HTMLElement;
  joystickBase: HTMLElement;
  joystickKnob: HTMLElement;
  shell: HTMLElement;
  messageEl: HTMLElement;
  bannerEl: HTMLElement;
  rightPanel: HTMLElement;
  shopOverlay: HTMLElement;
  battleConfirm: HTMLElement;
  deathOverlay: HTMLElement;
  restartBtn: HTMLElement;
  restartConfirm: HTMLElement;
  playerName: string;
  playerAge: string;
  loader: SpriteLoader;
}

const MOVE_DURATION = CONFIG.timing.moveDuration;
const BATTLE_DURATION = CONFIG.timing.battleDuration;
const FLOAT_DURATION = CONFIG.timing.floatDuration;
const WALK_PATTERN: Array<0 | 1 | 2> = [0, 1, 0, 2];

export class GameEngine {
  private readonly renderer: Renderer;
  private readonly input: InputManager;
  private readonly joystick: Joystick;
  private readonly victory: VictoryEffect;
  private readonly shopOverlay: HTMLElement;
  private readonly battleConfirm: HTMLElement;
  private readonly deathOverlay: HTMLElement;
  private readonly restartConfirm: HTMLElement;
  private readonly restartBtn: HTMLElement;
  private readonly playerName: string;
  private floors: FloorDefinition[] = [];
  private floorIndex = 0;
  private player!: PlayerState;
  private message = '欢迎来到生日魔塔！';
  private messageTimer?: number;
  private victoryShown = false;
  private shopOpen = false;
  private pendingDirection?: Direction;
  private pendingBattle?: { cell: Cell; x: number; y: number; direction: Direction };
  private moveAnimation?: MoveAnimation;
  private battleAnimation?: BattleAnimation;
  private floatingTexts: FloatingText[] = [];
  private rafId = 0;
  private lastFrame = 0;

  constructor(config: GameConfig) {
    this.renderer = new Renderer(config.canvas, config.messageEl, config.bannerEl, config.rightPanel, config.restartBtn, config.loader);
    this.input = new InputManager((action) => this.handleAction(action));
    this.joystick = new Joystick(config.joystickBase, config.joystickKnob, (action) => this.handleAction(action));
    this.victory = new VictoryEffect(config.shell, config.playerName, config.playerAge, () => this.newGame());
    this.shopOverlay = config.shopOverlay;
    this.battleConfirm = config.battleConfirm;
    this.deathOverlay = config.deathOverlay;
    this.restartBtn = config.restartBtn;
    this.restartConfirm = config.restartConfirm;
    this.playerName = config.playerName;

    this.setupShop();
    this.setupBattleConfirm();
    this.setupDeathOverlay();
    this.setupRestartBtn();
    this.initGame();
    this.lastFrame = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    this.renderer.destroy();
    this.input.destroy();
    this.joystick.destroy();
    this.victory.destroy();
    if (this.messageTimer) {
      window.clearTimeout(this.messageTimer);
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private setupBattleConfirm(): void {
    this.battleConfirm.querySelector('.confirm-yes')!.addEventListener('click', () => {
      if (!this.pendingBattle) return;
      const pb = this.pendingBattle;
      this.pendingBattle = undefined;
      this.battleConfirm.classList.remove('visible');
      this.executeBattle(pb.cell, pb.x, pb.y);
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
    this.restartBtn.addEventListener('click', () => {
      requestAnimationFrame(() => {
        this.restartConfirm.classList.add('visible');
      });
    });
    this.restartConfirm.querySelector('.restart-yes')!.addEventListener('click', () => {
      this.restartConfirm.classList.remove('visible');
      this.newGame();
    });
    this.restartConfirm.querySelector('.restart-no')!.addEventListener('click', () => {
      this.restartConfirm.classList.remove('visible');
    });
  }

  private setupShop(): void {
    const shopLabels: Record<string, string> = { hp: 'HP', atk: '攻', def: '防' };
    const btns = this.shopOverlay.querySelectorAll<HTMLButtonElement>('[data-shop]');
    for (const btn of btns) {
      const action = btn.dataset.shop! as 'hp' | 'atk' | 'def';
      const item = CONFIG.shop[action];
      if (item) btn.textContent = `${shopLabels[action]}+${item.gain} (${item.cost}金)`;
    }
    this.shopOverlay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest<HTMLButtonElement>('[data-shop]');
      if (!btn) {
        if (target.closest('.shop-close')) {
          this.closeShop();
        }
        return;
      }

      const action = btn.dataset.shop! as 'hp' | 'atk' | 'def';
      const shopItem = CONFIG.shop[action];
      if (!shopItem || this.player.gold < shopItem.cost) return;

      this.player.gold -= shopItem.cost;
      if (action === 'hp') { this.player.hp += shopItem.gain; }
      else if (action === 'atk') { this.player.atk += shopItem.gain; }
      else if (action === 'def') { this.player.def += shopItem.gain; }
      this.showMessage(`${action === 'hp' ? 'HP' : action === 'atk' ? '攻' : '防'}+${shopItem.gain}`);

      this.updateShopButtons();
      this.save();
    });
  }

  private openShop(): void {
    this.shopOpen = true;
    this.updateShopButtons();
    this.shopOverlay.classList.add('visible');
  }

  private closeShop(): void {
    this.shopOpen = false;
    this.shopOverlay.classList.remove('visible');
  }

  private updateShopButtons(): void {
    const gold = this.player.gold;
    const btns = this.shopOverlay.querySelectorAll<HTMLButtonElement>('[data-shop]');
    for (const btn of btns) {
      const action = btn.dataset.shop! as 'hp' | 'atk' | 'def';
      const shopItem = CONFIG.shop[action];
      btn.disabled = !shopItem || gold < shopItem.cost;
    }
    const goldEl = this.shopOverlay.querySelector('.shop-gold');
    if (goldEl) goldEl.textContent = `金币: ${gold}`;
  }

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
    this.shopOpen = false;
    this.shopOverlay.classList.remove('visible');
    this.battleConfirm.classList.remove('visible');
    this.deathOverlay.classList.remove('visible');
    this.pendingDirection = undefined;
    this.pendingBattle = undefined;
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
      this.message = '欢迎来到生日魔塔！';
    }
  }

  private newGame(): void {
    clearSave();
    this.reset();
    this.message = '欢迎来到生日魔塔！';
  }

  private save(): void {
    saveGame(this.floorIndex, this.player, this.floors);
  }

  private readonly loop = (now: number): void => {
    const delta = Math.min(40, now - this.lastFrame);
    this.lastFrame = now;

    this.update(now, delta);
    this.render(now);

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(now: number, delta: number): void {
    if (this.moveAnimation) {
      this.updateMovement(now, delta);
    }

    if (this.battleAnimation) {
      this.updateBattle(now);
    }

    this.floatingTexts = this.floatingTexts.filter((label) => now - label.start < label.duration);
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
      battle: this.getBattleRenderState(),
      monsters: this.getFloorMonsters(),
    });
  }

  private get currentFloor(): FloorDefinition {
    return this.floors[this.floorIndex];
  }

  private getFloorMonsters(): MonsterInfo[] {
    const result: MonsterInfo[] = [];
    const seen = new Set<MonsterId>();
    for (const row of this.currentFloor.grid) {
      for (const cell of row) {
        if (cell.monster && !seen.has(cell.monster)) {
          seen.add(cell.monster);
          const m = MONSTERS[cell.monster];
          const atlasEntry = ATLAS[cell.monster as keyof typeof ATLAS];
          const sprite: SpriteRef = atlasEntry && 'x' in atlasEntry
            ? { src: atlasEntry.src, x: atlasEntry.x, y: atlasEntry.y, w: atlasEntry.w, h: atlasEntry.h, srcWidth: atlasEntry.src.includes('enemys') ? 64 : 32 }
            : { src: '/sprites/enemys.png', x: 0, y: 0, w: 32, h: 32, srcWidth: 64 };
          result.push({
            name: m.name,
            hp: m.hp,
            atk: m.atk,
            def: m.def,
            sprite,
          });
        }
      }
    }
    return result;
  }


  private handleAction(action: InputAction): void {
    if (this.victoryShown || this.shopOpen || this.pendingBattle || this.restartConfirm.classList.contains('visible')) {
      return;
    }

    if (this.player.isMoving) {
      this.pendingDirection = action;
      return;
    }

    if (this.battleAnimation) {
      return;
    }

    this.tryMove(action);
  }

  private tryMove(direction: Direction): void {
    const { dx, dy } = this.directionToVector(direction);
    this.player.dir = direction;
    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;
    const cell = this.currentFloor.grid[nextY]?.[nextX];

    if (!cell) {
      return;
    }

    if (cell.terrain === 'wall') {
      return;
    }

    if (cell.door) {
      const opened = consumeDoorKey(this.player, cell.door);
      if (!opened) {
        this.showMessage('钥匙不够');
        return;
      }

      cell.door = undefined;
      this.showMessage('开门');
      this.save();
      return;
    }

    if (cell.monster) {
      this.startBattle(cell, nextX, nextY);
      return;
    }

    if (cell.merchant) {
      this.openShop();
      return;
    }

    this.startMove(nextX, nextY, performance.now());
  }

  private startMove(targetGridX: number, targetGridY: number, now: number): void {
    this.moveAnimation = {
      fromX: this.player.visualX,
      fromY: this.player.visualY,
      toX: targetGridX * TILE_SIZE,
      toY: targetGridY * TILE_SIZE,
      targetGridX,
      targetGridY,
      start: now,
      duration: MOVE_DURATION,
    };
    this.player.isMoving = true;
    this.player.walkFrame = 0;
    this.player.walkFrameTimer = 0;
  }

  private updateMovement(now: number, delta: number): void {
    const move = this.moveAnimation;
    if (!move) {
      return;
    }

    const progress = Math.min(1, (now - move.start) / move.duration);
    const eased = easeInOutQuad(progress);
    this.player.visualX = move.fromX + (move.toX - move.fromX) * eased;
    this.player.visualY = move.fromY + (move.toY - move.fromY) * eased;
    this.player.walkFrameTimer += delta;
    this.player.walkFrame = WALK_PATTERN[Math.floor(this.player.walkFrameTimer / 40) % WALK_PATTERN.length];

    if (progress < 1) {
      return;
    }

    this.player.x = move.targetGridX;
    this.player.y = move.targetGridY;
    this.player.visualX = move.toX;
    this.player.visualY = move.toY;
    this.player.isMoving = false;
    this.player.walkFrame = 0;
    this.player.walkFrameTimer = 0;
    this.moveAnimation = undefined;

    const cell = this.currentFloor.grid[this.player.y][this.player.x];
    this.resolveCellArrival(cell);
    this.tryConsumePendingDirection();
  }

  private startBattle(cell: Cell, x: number, y: number): void {
    const monsterId = cell.monster as MonsterId;
    const monster = MONSTERS[monsterId];
    const estimate = estimateBattle(this.player.hp, this.player.atk, this.player.def, monsterId);

    if (estimate.damageTaken > 0) {
      const hpAfter = Math.max(0, this.player.hp - estimate.damageTaken);
      const body = this.battleConfirm.querySelector('.confirm-body')!;
      body.innerHTML =
        `<div>对手：${monster.name}（HP${monster.hp}/攻${monster.atk}/防${monster.def}）</div>` +
        `<div>HP: <strong>${this.player.hp}</strong> → <strong style="color:${estimate.fatal ? '#ff5f56' : '#ffb3b3'}">${hpAfter}</strong></div>` +
        (estimate.fatal ? '<div style="color:#ff5f56;font-weight:700">⚠ 你会被击败！</div>' : '');
      this.pendingBattle = { cell, x, y, direction: this.player.dir };
      this.battleConfirm.classList.add('visible');
      return;
    }

    this.executeBattle(cell, x, y);
  }

  private executeBattle(cell: Cell, x: number, y: number): void {
    const monsterId = cell.monster as MonsterId;
    const estimate = estimateBattle(this.player.hp, this.player.atk, this.player.def, monsterId);

    const now = performance.now();
    const { dx, dy } = this.directionToVector(this.player.dir);
    this.battleAnimation = {
      start: now,
      duration: BATTLE_DURATION,
      gridX: x,
      gridY: y,
      monsterId,
      estimate,
      playerDashX: dx * 6,
      playerDashY: dy * 6,
      monsterShakeX: 0,
      monsterShakeY: 0,
      monsterFlashAlpha: 0,
    };

    this.addFloatingText(`-${estimate.playerHit}`, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + 10, '#ff5f56', now, FLOAT_DURATION);
    if (estimate.damageTaken > 0) {
      this.addFloatingText(`-${estimate.damageTaken}`, this.player.visualX + TILE_SIZE / 2, this.player.visualY - 4, '#ffb3b3', now, FLOAT_DURATION);
    }
  }

  private updateBattle(now: number): void {
    const battle = this.battleAnimation;
    if (!battle) {
      return;
    }

    const progress = Math.min(1, (now - battle.start) / battle.duration);
    const dash = Math.sin(progress * Math.PI) * 6;
    const { dx, dy } = this.directionToVector(this.player.dir);
    battle.playerDashX = dx * dash;
    battle.playerDashY = dy * dash;
    battle.monsterShakeX = Math.round((Math.random() * 4 - 2) * 10) / 10;
    battle.monsterShakeY = Math.round((Math.random() * 4 - 2) * 10) / 10;
    battle.monsterFlashAlpha = Math.max(0, Math.sin(progress * Math.PI * 4)) * 0.45;

    if (progress < 1) {
      return;
    }

    this.finishBattle(battle);
  }

  private finishBattle(battle: BattleAnimation): void {
    const cell = this.currentFloor.grid[battle.gridY]?.[battle.gridX];
    if (!cell?.monster) {
      this.battleAnimation = undefined;
      return;
    }

    const monster = MONSTERS[battle.monsterId];
    this.player.hp -= battle.estimate.damageTaken;

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.battleAnimation = undefined;
      clearSave();
      const body = this.deathOverlay.querySelector('.death-body')!;
      body.innerHTML = `<div>被 ${monster.name} 击败</div>`;
      this.deathOverlay.classList.add('visible');
      return;
    }

    this.player.gold += monster.gold;
    this.player.exp += monster.exp;
    cell.monster = undefined;

    this.player.x = battle.gridX;
    this.player.y = battle.gridY;
    this.player.visualX = battle.gridX * TILE_SIZE;
    this.player.visualY = battle.gridY * TILE_SIZE;

    const now = performance.now();
    this.addFloatingText(`+${monster.gold}G`, battle.gridX * TILE_SIZE + TILE_SIZE / 2, battle.gridY * TILE_SIZE + 2, '#f6d04d', now, 650);
    this.addFloatingText(`+${monster.exp}EXP`, battle.gridX * TILE_SIZE + TILE_SIZE / 2, battle.gridY * TILE_SIZE + 18, '#9be564', now, 650);
    this.showMessage(`击败${monster.name}！金币+${monster.gold} 经验+${monster.exp}`);

    const lvMsgs = checkLevelUp(this.player);
    for (const msg of lvMsgs) {
      this.addFloatingText('LEVEL UP!', this.player.visualX + TILE_SIZE / 2, this.player.visualY - 10, '#ffd700', now, 800);
      this.showMessage(msg);
    }

    this.battleAnimation = undefined;
    this.save();

    if (battle.monsterId === 'wither') {
      this.victoryShown = true;
      window.setTimeout(() => this.victory.show(), 250);
      return;
    }

    this.resolveCellArrival(this.currentFloor.grid[this.player.y][this.player.x]);
    this.tryConsumePendingDirection();
  }

  private resolveCellArrival(cell: Cell): void {
    if (cell.item) {
      const item = cell.item;
      cell.item = undefined;
      this.showMessage(applyItem(this.player, item));
      const lvMsgs = checkLevelUp(this.player);
      for (const msg of lvMsgs) {
        this.showMessage(msg);
      }
      this.save();
    }

    this.handleStair(cell);
  }

  private handleStair(cell: Cell): void {
    if (cell.terrain === 'stair-up') {
      if (this.floorIndex >= this.floors.length - 1) {
        this.showMessage('前方已经没有更高的楼层');
        return;
      }

      this.floorIndex += 1;
      const downStair = findStair(this.currentFloor, 'stair-down');
      const adj = findAdjacentFloor(this.currentFloor, downStair.x, downStair.y);
      this.placePlayer(adj.x, adj.y);
      this.pendingDirection = undefined;
      this.showMessage(`${this.currentFloor.name}`);
      this.save();
      return;
    }

    if (cell.terrain === 'stair-down') {
      if (this.floorIndex === 0) {
        this.showMessage('这里已经是第一层');
        return;
      }

      this.floorIndex -= 1;
      const floor = this.currentFloor;
      if (floor.comeDown) {
        this.placePlayer(floor.comeDown.x, floor.comeDown.y);
      } else {
        const upStair = findStair(floor, 'stair-up');
        const adj = findAdjacentFloor(floor, upStair.x, upStair.y);
        this.placePlayer(adj.x, adj.y);
      }
      this.pendingDirection = undefined;
      this.showMessage(`${this.currentFloor.name}`);
      this.save();
    }
  }

  private placePlayer(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
    this.player.visualX = x * TILE_SIZE;
    this.player.visualY = y * TILE_SIZE;
    this.player.walkFrame = 0;
    this.player.walkFrameTimer = 0;
    this.player.isMoving = false;
  }

  private tryConsumePendingDirection(): void {
    if (!this.pendingDirection || this.player.isMoving || this.battleAnimation || this.victoryShown) {
      return;
    }

    const nextDirection = this.pendingDirection;
    this.pendingDirection = undefined;
    this.tryMove(nextDirection);
  }

  private directionToVector(direction: Direction): { dx: number; dy: number } {
    if (direction === 'up') return { dx: 0, dy: -1 };
    if (direction === 'down') return { dx: 0, dy: 1 };
    if (direction === 'left') return { dx: -1, dy: 0 };
    return { dx: 1, dy: 0 };
  }

  private showMessage(text: string): void {
    this.message = text;
    if (this.messageTimer) {
      window.clearTimeout(this.messageTimer);
    }

    this.messageTimer = window.setTimeout(() => {
      this.message = '';
    }, CONFIG.timing.messageDuration);
  }

  private addFloatingText(text: string, x: number, y: number, color: string, start: number, duration: number): void {
    this.floatingTexts.push({ text, x, y, rise: 30, color, start, duration });
  }

  private getFloatingTextRenderState(now: number): FloatingTextRenderState[] {
    return this.floatingTexts.map((label) => {
      const progress = Math.min(1, (now - label.start) / label.duration);
      return {
        text: label.text,
        x: label.x,
        y: label.y - label.rise * progress,
        color: label.color,
        alpha: 1 - progress,
      };
    });
  }

  private getBattleRenderState(): BattleRenderState | undefined {
    const battle = this.battleAnimation;
    if (!battle) return undefined;

    return {
      active: true,
      targetX: battle.gridX,
      targetY: battle.gridY,
      monsterId: battle.monsterId,
      playerDashX: battle.playerDashX,
      playerDashY: battle.playerDashY,
      monsterShakeX: battle.monsterShakeX,
      monsterShakeY: battle.monsterShakeY,
      monsterFlashAlpha: battle.monsterFlashAlpha,
    };
  }

  debugGoToFloor(index: number): void {
    if (index < 0 || index >= this.floors.length) return;
    this.floorIndex = index;
    const floor = this.currentFloor;
    this.placePlayer(floor.start.x, floor.start.y);
    this.pendingDirection = undefined;
    this.pendingBattle = undefined;
    this.moveAnimation = undefined;
    this.battleAnimation = undefined;
    this.showMessage(`跳转到 F${index + 1} ${floor.name}`);
    this.save();
  }

  debugAdjustPlayer(key: string, delta: number): void {
    const p = this.player as any;
    if (typeof p[key] === 'number') {
      p[key] = Math.max(0, p[key] + delta);
    }
  }

  debugAdjustMonster(id: string, stat: 'hp' | 'atk' | 'def' | 'gold' | 'exp', delta: number): void {
    const m = CONFIG.monsters[id as keyof typeof CONFIG.monsters];
    if (m) {
      (m as any)[stat] = Math.max(1, m[stat] + delta);
    }
  }

  debugGetPlayer(): PlayerState | undefined {
    return this.player;
  }
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function findStair(floor: FloorDefinition, terrain: 'stair-up' | 'stair-down'): { x: number; y: number } {
  for (let y = 0; y < floor.grid.length; y += 1) {
    for (let x = 0; x < floor.grid[y].length; x += 1) {
      if (floor.grid[y][x].terrain === terrain) {
        return { x, y };
      }
    }
  }

  throw new Error(`Failed to find ${terrain} on floor ${floor.id}.`);
}

function findAdjacentFloor(floor: FloorDefinition, sx: number, sy: number): { x: number; y: number } {
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (const [dx, dy] of dirs) {
    const nx = sx + dx;
    const ny = sy + dy;
    const cell = floor.grid[ny]?.[nx];
    if (cell && cell.terrain === 'floor' && !cell.monster && !cell.door && !cell.merchant) {
      return { x: nx, y: ny };
    }
  }
  return { x: sx, y: sy };
}
