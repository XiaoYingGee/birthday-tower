import type { Cell, FloorDefinition, MonsterId } from '../data/floor';
import type { PlayerState } from '../entities/player';
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

export interface RenderState {
  now: number;
  floorNumber: number;
  floorName: string;
  floor: FloorDefinition;
  player: PlayerState;
  playerName: string;
  message: string;
  floatingTexts: FloatingTextRenderState[];
  battle?: BattleRenderState;
}

const GRID_SIZE = 13;

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly messageEl: HTMLElement;
  private readonly bannerEl: HTMLElement;
  private readonly rightPanel: HTMLElement;
  private readonly loader: SpriteLoader;
  private scale = 2;

  constructor(
    canvas: HTMLCanvasElement,
    messageEl: HTMLElement,
    bannerEl: HTMLElement,
    rightPanel: HTMLElement,
    loader: SpriteLoader,
  ) {
    this.canvas = canvas;
    this.messageEl = messageEl;
    this.bannerEl = bannerEl;
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

  screenToGrid(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / (TILE_SIZE * this.scale));
    const y = Math.floor((clientY - rect.top) / (TILE_SIZE * this.scale));
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
    return { x, y };
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
        this.drawCell(state, cell, x, y, drawX, drawY, state.now);
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

    this.bannerEl.textContent = `F${state.floorNumber}`;

    const p = state.player;
    let html =
      `<div class="panel-title"><strong>${state.playerName}</strong> <strong>Lv.${p.level}</strong>（${p.exp}/100）</div>` +
      '<hr class="panel-divider">' +
      `<div class="stat">${spriteIcon('/sprites/icons.png', 3)}<span class="label">HP</span><span class="val">${p.hp}</span></div>` +
      `<div class="stat">${spriteIcon('/sprites/items.png', 50)}<span class="label">攻击</span><span class="val">${p.atk}</span></div>` +
      `<div class="stat">${spriteIcon('/sprites/items.png', 55)}<span class="label">防御</span><span class="val">${p.def}</span></div>` +
      `<div class="stat">${spriteIcon('/sprites/items.png', 11)}<span class="label">金币</span><span class="val">${p.gold}</span></div>` +
      '<hr class="panel-divider">' +
      '<div class="section-title">道具</div>' +
      '<hr class="panel-divider">' +
      `<div class="stat">${spriteIcon('/sprites/items.png', 0)}<span class="label">黄钥匙</span><span class="val">${p.yellowKeys}</span></div>` +
      `<div class="stat">${spriteIcon('/sprites/items.png', 1)}<span class="label">蓝钥匙</span><span class="val">${p.blueKeys}</span></div>` +
      `<div class="stat">${spriteIcon('/sprites/items.png', 2)}<span class="label">红钥匙</span><span class="val">${p.redKeys}</span></div>`;

    this.rightPanel.innerHTML = html;

    this.messageEl.textContent = state.message;
    this.messageEl.classList.toggle('visible', state.message.length > 0);
  }

  private readonly resize = (): void => {
    const logicalSize = GRID_SIZE * TILE_SIZE;

    const bannerH = 32;
    const isTouchDevice = matchMedia('(pointer: coarse)').matches;
    const joystickReserve = isTouchDevice ? 170 : 0;
    const verticalPad = 16 + bannerH;
    const availableHeight = window.innerHeight - joystickReserve - verticalPad;
    const availableWidth = window.innerWidth;

    const maxScale = Math.min(availableWidth / logicalSize, availableHeight / logicalSize);
    const nextScale = Math.max(1, maxScale);

    this.scale = nextScale;
    const cssSize = Math.floor(logicalSize * this.scale);
    const pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(cssSize * pixelRatio);
    this.canvas.height = Math.round(cssSize * pixelRatio);
    this.canvas.style.width = `${cssSize}px`;
    this.canvas.style.height = `${cssSize}px`;
    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.ctx.imageSmoothingEnabled = false;

    requestAnimationFrame(() => {
      const rect = this.canvas.getBoundingClientRect();
      this.bannerEl.style.left = `${rect.left}px`;
      this.bannerEl.style.top = `${rect.top - bannerH}px`;
      const rightWrap = this.rightPanel.parentElement;
      if (rightWrap) {
        rightWrap.style.left = `${rect.right + 8}px`;
        rightWrap.style.top = `${rect.top}px`;
      }
    });
  };

  private drawCell(state: RenderState, cell: Cell, gridX: number, gridY: number, drawX: number, drawY: number, now: number): void {
    if (cell.terrain === 'wall') {
      this.loader.drawAt(this.ctx, 'wall', drawX, drawY, this.scale);
    } else if (cell.terrain === 'stair-up') {
      this.loader.drawAt(this.ctx, 'stairUp', drawX, drawY, this.scale);
    } else if (cell.terrain === 'stair-down') {
      this.loader.drawAt(this.ctx, 'stairDown', drawX, drawY, this.scale);
    } else {
      this.loader.drawAt(this.ctx, 'floor', drawX, drawY, this.scale);
    }

    if (cell.door) {
      const name: AtlasKey = cell.door === 'yellow' ? 'doorYellow' : cell.door === 'blue' ? 'doorBlue' : 'doorRed';
      this.loader.drawAt(this.ctx, name, drawX, drawY, this.scale);
    }

    if (cell.merchant) {
      this.loader.drawAt(this.ctx, 'merchant', drawX, drawY, this.scale, now);
    }

    if (cell.princess) {
      this.loader.drawAt(this.ctx, 'princess', drawX, drawY, this.scale, now);
    }

    if (cell.fairy) {
      this.loader.drawAt(this.ctx, 'fairy', drawX, drawY, this.scale, now);
    }

    if (cell.keyShop) {
      this.loader.drawAt(this.ctx, 'keyShop', drawX, drawY, this.scale, now);
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

    this.loader.drawAt(this.ctx, cell.monster, monsterX, monsterY, this.scale, now);

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

function spriteIcon(src: string, index: number): string {
  const y = index * 32;
  const posY = y * (24 / 32);
  return `<span class="sprite-icon" style="background-image:url(${src});background-position:0 -${posY}px"></span>`;
}
