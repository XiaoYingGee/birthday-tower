import type { Cell, FloorDefinition, MonsterId } from './floor';
import type { PlayerState } from './player';
import { HERO_FRAME_HEIGHT, TILE_SIZE, type AtlasKey, type SpriteLoader } from './sprite-atlas';

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
  message: string;
  floatingTexts: FloatingTextRenderState[];
  battle?: BattleRenderState;
}

const GRID_SIZE = 11;
const HUD_HEIGHT = 48;
const HP_TWEEN_MS = 200;

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly messageEl: HTMLElement;
  private readonly loader: SpriteLoader;
  private scale = 2;
  private displayedHp = 0;
  private hpTweenFrom = 0;
  private hpTweenTarget = 0;
  private hpTweenStart = 0;

  constructor(canvas: HTMLCanvasElement, messageEl: HTMLElement, loader: SpriteLoader) {
    this.canvas = canvas;
    this.messageEl = messageEl;
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
    const hudHeight = HUD_HEIGHT * this.scale;
    const width = GRID_SIZE * tileSize;
    const height = hudHeight + GRID_SIZE * tileSize;

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#0f1318';
    this.ctx.fillRect(0, 0, width, height);

    this.syncHudHp(state.now, state.player.hp);
    this.drawHud(state, width, hudHeight);

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const cell = state.floor.grid[y][x];
        const drawX = x * tileSize;
        const drawY = hudHeight + y * tileSize;
        this.drawCell(state, cell, x, y, drawX, drawY);
      }
    }

    const playerDrawX = state.player.visualX * this.scale + (state.battle?.playerDashX ?? 0) * this.scale;
    const playerDrawY = hudHeight + state.player.visualY * this.scale + (state.battle?.playerDashY ?? 0) * this.scale;
    this.loader.drawHero(
      this.ctx,
      playerDrawX,
      playerDrawY - (HERO_FRAME_HEIGHT - TILE_SIZE) * this.scale,
      this.scale,
      state.player.dir,
      state.player.walkFrame,
    );

    this.drawFloatingTexts(state, hudHeight);

    this.messageEl.textContent = state.message;
    this.messageEl.classList.toggle('visible', state.message.length > 0);
  }

  private readonly resize = (): void => {
    const availableWidth = window.innerWidth - 24;
    const availableHeight = window.innerHeight - 200;
    const logicalWidth = GRID_SIZE * TILE_SIZE;
    const logicalHeight = HUD_HEIGHT + GRID_SIZE * TILE_SIZE;
    const nextScale = Math.max(2, Math.floor(Math.min(availableWidth / logicalWidth, availableHeight / logicalHeight, 3)));

    this.scale = nextScale;
    this.canvas.width = logicalWidth * this.scale;
    this.canvas.height = logicalHeight * this.scale;
    this.canvas.style.width = `${this.canvas.width}px`;
    this.canvas.style.height = `${this.canvas.height}px`;
  };

  private syncHudHp(now: number, hp: number): void {
    if (this.hpTweenTarget === 0 && this.displayedHp === 0) {
      this.displayedHp = hp;
      this.hpTweenFrom = hp;
      this.hpTweenTarget = hp;
      this.hpTweenStart = now;
      return;
    }

    if (hp !== this.hpTweenTarget) {
      this.displayedHp = this.getTweenedHp(now);
      this.hpTweenFrom = this.displayedHp;
      this.hpTweenTarget = hp;
      this.hpTweenStart = now;
      return;
    }

    this.displayedHp = this.getTweenedHp(now);
  }

  private getTweenedHp(now: number): number {
    if (this.hpTweenTarget === this.hpTweenFrom) {
      return this.hpTweenTarget;
    }

    const progress = Math.min(1, (now - this.hpTweenStart) / HP_TWEEN_MS);
    return this.hpTweenFrom + (this.hpTweenTarget - this.hpTweenFrom) * progress;
  }

  private drawHud(state: RenderState, width: number, hudHeight: number): void {
    this.ctx.fillStyle = '#182028';
    this.ctx.fillRect(0, 0, width, hudHeight);
    this.ctx.fillStyle = '#d5e4c8';
    this.ctx.font = `${14 * this.scale}px 'Trebuchet MS', 'Noto Sans SC', sans-serif`;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`F${state.floorNumber} ${state.floorName}`, 8 * this.scale, 6 * this.scale);
    this.ctx.font = `${10 * this.scale}px 'Trebuchet MS', 'Noto Sans SC', sans-serif`;
    this.ctx.fillText(
      `HP ${Math.round(this.displayedHp)}  攻 ${state.player.atk}  防 ${state.player.def}  金 ${state.player.gold}  经 ${state.player.exp}`,
      8 * this.scale,
      24 * this.scale,
    );
    this.ctx.fillText(
      `钥匙 黄${state.player.inventory.yellow} 蓝${state.player.inventory.blue} 红${state.player.inventory.red}  物品 红药${state.player.inventory.redPotion} 蓝药${state.player.inventory.bluePotion}`,
      8 * this.scale,
      35 * this.scale,
    );
  }

  private drawCell(state: RenderState, cell: Cell, gridX: number, gridY: number, drawX: number, drawY: number): void {
    const tileSprite: AtlasKey = cell.terrain === 'wall'
      ? 'wall'
      : cell.terrain === 'stair-up'
        ? 'stairUp'
        : cell.terrain === 'stair-down'
          ? 'stairDown'
          : 'floor';

    this.loader.drawAt(this.ctx, tileSprite, drawX, drawY, this.scale);

    if (cell.door) {
      const name: AtlasKey = cell.door === 'yellow' ? 'doorYellow' : cell.door === 'blue' ? 'doorBlue' : 'doorRed';
      this.loader.drawAt(this.ctx, name, drawX, drawY, this.scale);
    }

    if (cell.item) {
      const name: AtlasKey = cell.item === 'yellowKey'
        ? 'keyYellow'
        : cell.item === 'blueKey'
          ? 'keyBlue'
          : cell.item === 'redKey'
            ? 'keyRed'
            : cell.item === 'redPotion'
              ? 'redPotion'
              : cell.item === 'bluePotion'
                ? 'bluePotion'
                : 'gem';
      this.loader.drawAt(this.ctx, name, drawX, drawY, this.scale);
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

  private drawFloatingTexts(state: RenderState, hudHeight: number): void {
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
      const y = hudHeight + label.y * this.scale;
      this.ctx.strokeText(label.text, x, y);
      this.ctx.fillText(label.text, x, y);
      this.ctx.restore();
    }

    this.ctx.textAlign = 'start';
    this.ctx.textBaseline = 'alphabetic';
  }
}
