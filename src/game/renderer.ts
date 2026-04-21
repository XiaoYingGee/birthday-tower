import type { Cell, FloorDefinition } from './floor';
import type { PlayerState } from './player';
import { drawSprite, SPRITE_SIZE } from './sprites';

export interface RenderState {
  floorNumber: number;
  floorName: string;
  floor: FloorDefinition;
  player: PlayerState;
  message: string;
}

const GRID_SIZE = 11;
const HUD_HEIGHT = 48;

export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly messageEl: HTMLElement;
  private scale = 2;

  constructor(canvas: HTMLCanvasElement, messageEl: HTMLElement) {
    this.canvas = canvas;
    this.messageEl = messageEl;
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
    const tileSize = SPRITE_SIZE * this.scale;
    const hudHeight = HUD_HEIGHT * this.scale;
    const width = GRID_SIZE * tileSize;
    const height = hudHeight + GRID_SIZE * tileSize;

    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = '#111713';
    this.ctx.fillRect(0, 0, width, height);

    this.drawHud(state, width, hudHeight);

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const cell = state.floor.grid[y][x];
        const drawX = x * tileSize;
        const drawY = hudHeight + y * tileSize;
        this.drawCell(cell, drawX, drawY);
      }
    }

    const playerX = state.player.x * tileSize;
    const playerY = hudHeight + state.player.y * tileSize;
    drawSprite(this.ctx, 'player', playerX, playerY, this.scale);

    this.messageEl.textContent = state.message;
    this.messageEl.classList.toggle('visible', state.message.length > 0);
  }

  private readonly resize = (): void => {
    const availableWidth = window.innerWidth - 24;
    const availableHeight = window.innerHeight - 200;
    const logicalWidth = GRID_SIZE * SPRITE_SIZE;
    const logicalHeight = HUD_HEIGHT + GRID_SIZE * SPRITE_SIZE;
    const nextScale = Math.max(2, Math.floor(Math.min(availableWidth / logicalWidth, availableHeight / logicalHeight, 3)));

    this.scale = nextScale;
    this.canvas.width = logicalWidth * this.scale;
    this.canvas.height = logicalHeight * this.scale;
    this.canvas.style.width = `${this.canvas.width}px`;
    this.canvas.style.height = `${this.canvas.height}px`;
  };

  private drawHud(state: RenderState, width: number, hudHeight: number): void {
    this.ctx.fillStyle = '#1f2d20';
    this.ctx.fillRect(0, 0, width, hudHeight);
    this.ctx.fillStyle = '#eef7e9';
    this.ctx.font = `${14 * this.scale}px sans-serif`;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`F${state.floorNumber} ${state.floorName}`, 8 * this.scale, 6 * this.scale);
    this.ctx.font = `${10 * this.scale}px sans-serif`;
    this.ctx.fillText(
      `HP ${state.player.hp}  攻 ${state.player.atk}  防 ${state.player.def}  金 ${state.player.gold}  经 ${state.player.exp}`,
      8 * this.scale,
      24 * this.scale,
    );
    this.ctx.fillText(
      `钥匙 黄${state.player.inventory.yellow} 蓝${state.player.inventory.blue} 红${state.player.inventory.red}  物品 红药${state.player.inventory.redPotion} 蓝药${state.player.inventory.bluePotion}`,
      8 * this.scale,
      35 * this.scale,
    );
  }

  private drawCell(cell: Cell, x: number, y: number): void {
    const tileSprite = cell.terrain === 'wall'
      ? 'wall'
      : cell.terrain === 'stair-up'
        ? 'stairUp'
        : cell.terrain === 'stair-down'
          ? 'stairDown'
          : 'floor';

    drawSprite(this.ctx, tileSprite, x, y, this.scale);

    if (cell.door) {
      const name = cell.door === 'yellow' ? 'doorYellow' : cell.door === 'blue' ? 'doorBlue' : 'doorRed';
      drawSprite(this.ctx, name, x, y, this.scale);
    }

    if (cell.item) {
      const name =
        cell.item === 'yellowKey'
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
      drawSprite(this.ctx, name, x, y, this.scale);
    }

    if (cell.monster) {
      if (cell.monster === 'wither') {
        drawSprite(this.ctx, 'wither', x - 16 * this.scale, y, this.scale);
        return;
      }

      drawSprite(this.ctx, cell.monster, x, y, this.scale);
    }
  }
}
