import type { Cell, FloorDefinition, MonsterId } from './floor';
import type { PlayerState } from './player';
import { TILE_SIZE, type AtlasKey, type SpriteLoader } from './sprite-atlas';

export interface FloatingTextRenderState {
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
}

export interface BattleRenderState {
  active: boolean;
  targetX: number;
  targetY: number;
  monsterId: MonsterId;
  playerDashX: number;
  playerDashY: number;
  monsterShakeX: number;
  monsterShakeY: number;
  monsterFlashAlpha: number;
}

export interface MonsterInfo {
  name: string;
  hp: number;
  atk: number;
  def: number;
  damage: number;
  fatal: boolean;
}

export interface ItemInfo {
  name: string;
  desc: string;
}

export interface RenderState {
  now: number;
  floorNumber: number;
  floorName: string;
  floor: FloorDefinition;
  player: PlayerState;
  message: string;
  floatingTexts: FloatingTextRenderState[];
  battle?: BattleRenderState;
  monsters: MonsterInfo[];
  items: ItemInfo[];
}

const GRID_SIZE = 11;

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly messageEl: HTMLElement;
  private readonly bannerEl: HTMLElement;
  private readonly leftPanel: HTMLElement;
  private readonly rightPanel: HTMLElement;
  private readonly loader: SpriteLoader;
  private scale = 2;

  constructor(
    canvas: HTMLCanvasElement,
    messageEl: HTMLElement,
    bannerEl: HTMLElement,
    leftPanel: HTMLElement,
    rightPanel: HTMLElement,
    loader: SpriteLoader,
  ) {
    this.canvas = canvas;
    this.messageEl = messageEl;
    this.bannerEl = bannerEl;
    this.leftPanel = leftPanel;
    this.rightPanel = rightPanel;
    this.loader = loader;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create game canvas context.');
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  destroy(): void {
    window.removeEventListener('resize', this.resize);
  }

  render(state: RenderState): void {
    const tileSize = TILE_SIZE * this.scale;
    const width = GRID_SIZE * tileSize;
    const height = GRID_SIZE * tileSize;

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const cell = state.floor.grid[y][x];
        const drawX = x * tileSize;
        const drawY = y * tileSize;
        this.drawCell(state, cell, x, y, drawX, drawY);
      }
    }

    const playerDrawX = state.player.visualX * this.scale + (state.battle?.playerDashX ?? 0) * this.scale;
    const playerDrawY = state.player.visualY * this.scale + (state.battle?.playerDashY ?? 0) * this.scale;
    this.loader.drawHero(
      this.ctx,
      playerDrawX,
      playerDrawY,
      this.scale,
      state.player.dir,
      state.player.walkFrame,
    );

    this.drawFloatingTexts(state);

    this.bannerEl.textContent = `F${state.floorNumber} ${state.floorName}`;

    this.leftPanel.innerHTML =
      `<div class="stat">HP <span class="val">${state.player.hp}</span></div>` +
      `<div class="stat">攻 <span class="val">${state.player.atk}</span></div>` +
      `<div class="stat">防 <span class="val">${state.player.def}</span></div>` +
      `<div class="stat">金 <span class="val">${state.player.gold}</span></div>` +
      `<div class="stat">经验 <span class="val">${state.player.exp}/100</span></div>` +
      `<div class="stat">Lv <span class="val">${state.player.level}</span></div>` +
      `<div class="stat">钥匙 <span class="val">${state.player.keys}</span></div>`;

    let rightHtml = '';
    if (state.monsters.length > 0) {
      rightHtml += '<div class="section-title">怪物</div>';
      for (const m of state.monsters) {
        const dmgClass = m.fatal ? 'fatal' : 'safe';
        const dmgText = m.fatal ? '无法击败' : `-${m.damage}HP`;
        rightHtml += `<div class="monster-entry"><span class="m-name">${m.name}</span> <span class="m-stats">${m.hp}/${m.atk}/${m.def}</span> <span class="${dmgClass}">${dmgText}</span></div>`;
      }
    }
    if (state.items.length > 0) {
      rightHtml += '<div class="section-title">道具</div>';
      for (const item of state.items) {
        rightHtml += `<div class="item-entry"><span class="i-name">${item.name}</span> <span class="i-desc">${item.desc}</span></div>`;
      }
    }
    this.rightPanel.innerHTML = rightHtml;

    this.messageEl.textContent = state.message;
    this.messageEl.classList.toggle('visible', state.message.length > 0);
  }

  private readonly resize = (): void => {
    const availableHeight = window.innerHeight - 120;
    const logicalSize = GRID_SIZE * TILE_SIZE;
    const nextScale = Math.max(2, Math.floor(Math.min((window.innerWidth * 0.45) / logicalSize, availableHeight / logicalSize, 3)));

    this.scale = nextScale;
    this.canvas.width = logicalSize * this.scale;
    this.canvas.height = logicalSize * this.scale;
    this.canvas.style.width = `${this.canvas.width}px`;
    this.canvas.style.height = `${this.canvas.height}px`;
  };

  private drawCell(state: RenderState, cell: Cell, gridX: number, gridY: number, drawX: number, drawY: number): void {
    const tileSprite: AtlasKey = cell.terrain === 'wall'
      ? 'wall'
      : cell.terrain === 'stair-up'
        ? 'stairUp'
        : cell.terrain === 'stair-down'
          ? 'stairDown'
          : 'floor';

    if (cell.terrain === 'floor') {
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(drawX, drawY, TILE_SIZE * this.scale, TILE_SIZE * this.scale);
    }

    this.loader.drawAt(this.ctx, tileSprite, drawX, drawY, this.scale);

    if (cell.door) {
      const name: AtlasKey = cell.door === 'yellow' ? 'doorYellow' : cell.door === 'blue' ? 'doorBlue' : 'doorRed';
      this.loader.drawAt(this.ctx, name, drawX, drawY, this.scale);
    }

    if (cell.merchant) {
      this.loader.drawAt(this.ctx, 'merchant', drawX, drawY, this.scale);
    }

    if (cell.item) {
      const itemAtlas: Record<string, AtlasKey> = {
        yellowKey: 'keyYellow',
        blueKey: 'keyBlue',
        redKey: 'keyRed',
        redPotion: 'redPotion',
        bluePotion: 'bluePotion',
        redGem: 'redGem',
        blueGem: 'blueGem',
        treasure: 'treasure',
      };
      const name = itemAtlas[cell.item];
      if (name) {
        this.loader.drawAt(this.ctx, name, drawX, drawY, this.scale);
      }
    }

    if (!cell.monster) {
      return;
    }

    const battle = state.battle;
    const isBattleTarget = battle?.active && battle.targetX === gridX && battle.targetY === gridY;
    const monsterX = drawX + (isBattleTarget ? battle.monsterShakeX * this.scale : 0);
    const monsterY = drawY + (isBattleTarget ? battle.monsterShakeY * this.scale : 0);

    this.loader.drawAt(this.ctx, cell.monster, monsterX, monsterY, this.scale);

    if (!isBattleTarget || !battle.monsterFlashAlpha) {
      return;
    }

    this.ctx.save();
    this.ctx.globalAlpha = battle.monsterFlashAlpha;
    this.ctx.fillStyle = '#ff3d2e';
    this.ctx.fillRect(monsterX, monsterY, TILE_SIZE * this.scale, TILE_SIZE * this.scale);
    this.ctx.restore();
  }

  private drawFloatingTexts(state: RenderState): void {
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = `${12 * this.scale}px 'Trebuchet MS', 'Noto Sans SC', sans-serif`;

    for (const label of state.floatingTexts) {
      this.ctx.save();
      this.ctx.globalAlpha = label.alpha;
      this.ctx.fillStyle = label.color;
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.lineWidth = 2 * this.scale;
      const x = label.x * this.scale;
      const y = label.y * this.scale;
      this.ctx.strokeText(label.text, x, y);
      this.ctx.fillText(label.text, x, y);
      this.ctx.restore();
    }

    this.ctx.textAlign = 'start';
    this.ctx.textBaseline = 'alphabetic';
  }
}
