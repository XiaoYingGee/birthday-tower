import { createFloors } from './floors';
import type { Cell, FloorDefinition, MonsterId } from './floor';
import { InputManager, type InputAction } from './input';
import { estimateBattle, MONSTERS } from './monster';
import { applyItem, consumeDoorKey, createPlayer, useInventoryItem, type PlayerState } from './player';
import { Renderer } from './renderer';
import { VictoryEffect } from './victory';

export interface GameConfig {
  canvas: HTMLCanvasElement;
  controls: HTMLElement;
  shell: HTMLElement;
  messageEl: HTMLElement;
  playerName: string;
  playerAge: string;
}

export class GameEngine {
  private readonly renderer: Renderer;
  private readonly input: InputManager;
  private readonly victory: VictoryEffect;
  private floors: FloorDefinition[] = [];
  private floorIndex = 0;
  private player!: PlayerState;
  private message = '欢迎来到生日魔塔，先清理僵尸吧';
  private messageTimer?: number;
  private victoryShown = false;

  constructor(config: GameConfig) {
    this.renderer = new Renderer(config.canvas, config.messageEl);
    this.input = new InputManager(config.controls, (action) => this.handleAction(action));
    this.victory = new VictoryEffect(config.shell, config.playerName, config.playerAge, () => this.reset());

    this.reset();
    window.addEventListener('resize', this.render);
  }

  destroy(): void {
    window.removeEventListener('resize', this.render);
    this.renderer.destroy();
    this.input.destroy();
    this.victory.destroy();
    if (this.messageTimer) {
      window.clearTimeout(this.messageTimer);
    }
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
    this.message = '欢迎来到生日魔塔，先清理僵尸吧';
    this.victoryShown = false;
    this.render();
  }

  private readonly render = (): void => {
    this.renderer.render({
      floorNumber: this.floorIndex + 1,
      floorName: this.currentFloor.name,
      floor: this.currentFloor,
      player: this.player,
      message: this.message,
    });
  };

  private get currentFloor(): FloorDefinition {
    return this.floors[this.floorIndex];
  }

  private handleAction(action: InputAction): void {
    if (this.victoryShown) {
      return;
    }

    switch (action) {
      case 'up':
        this.tryMove(0, -1, 'up');
        break;
      case 'down':
        this.tryMove(0, 1, 'down');
        break;
      case 'left':
        this.tryMove(-1, 0, 'left');
        break;
      case 'right':
        this.tryMove(1, 0, 'right');
        break;
      case 'attack':
        this.attackForward();
        break;
      case 'item':
        this.showMessage(useInventoryItem(this.player));
        this.render();
        break;
    }
  }

  private tryMove(dx: number, dy: number, facing: PlayerState['facing']): void {
    this.player.facing = facing;
    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;
    const cell = this.currentFloor.grid[nextY]?.[nextX];

    if (!cell) {
      return;
    }

    if (cell.terrain === 'wall') {
      this.showMessage('前面是墙');
      this.render();
      return;
    }

    if (cell.door) {
      const doorName = this.getDoorName(cell.door);
      const opened = consumeDoorKey(this.player, cell.door);
      if (!opened) {
        this.showMessage(`${doorName}还打不开`);
        this.render();
        return;
      }

      cell.door = undefined;
      this.showMessage(`${doorName}打开了`);
      this.render();
      return;
    }

    if (cell.monster) {
      this.resolveBattle(cell, nextX, nextY, true);
      return;
    }

    this.player.x = nextX;
    this.player.y = nextY;

    if (cell.item) {
      const item = cell.item;
      cell.item = undefined;
      this.showMessage(applyItem(this.player, item));
    }

    this.handleStair(cell);
    this.render();
  }

  private attackForward(): void {
    const { x, y } = this.getFacingTarget();
    const cell = this.currentFloor.grid[y]?.[x];
    if (!cell?.monster) {
      this.showMessage('前方没有怪物');
      this.render();
      return;
    }

    this.resolveBattle(cell, x, y, false);
  }

  private resolveBattle(cell: Cell, x: number, y: number, moveIntoCell: boolean): void {
    const monsterId = cell.monster as MonsterId;
    const monster = MONSTERS[monsterId];
    const estimate = estimateBattle(this.player.hp, this.player.atk, this.player.def, monsterId);

    if (estimate.fatal) {
      this.showMessage(`暂时打不过，挑战 ${monster.name} 需要承受 ${estimate.damageTaken} 点伤害`);
      this.render();
      return;
    }

    this.player.hp -= estimate.damageTaken;
    this.player.gold += monster.gold;
    this.player.exp += monster.exp;
    cell.monster = undefined;

    if (moveIntoCell) {
      this.player.x = x;
      this.player.y = y;
    }

    this.showMessage(`击败${monster.name}，损失 ${estimate.damageTaken} HP`);

    if (monsterId === 'wither') {
      this.victoryShown = true;
      this.render();
      window.setTimeout(() => this.victory.show(), 250);
      return;
    }

    this.render();
  }

  private handleStair(cell: Cell): void {
    if (cell.terrain === 'stair-up') {
      if (this.floorIndex >= this.floors.length - 1) {
        this.showMessage('前方已经没有更高的楼层');
        return;
      }

      this.floorIndex += 1;
      const start = this.currentFloor.start;
      this.player.x = start.x;
      this.player.y = start.y;
      this.showMessage(`来到第 ${this.floorIndex + 1} 层：${this.currentFloor.name}`);
      return;
    }

    if (cell.terrain === 'stair-down') {
      if (this.floorIndex === 0) {
        this.showMessage('这里已经是第一层');
        return;
      }

      this.floorIndex -= 1;
      const start = this.currentFloor.start;
      this.player.x = start.x;
      this.player.y = start.y;
      this.showMessage(`回到第 ${this.floorIndex + 1} 层：${this.currentFloor.name}`);
    }
  }

  private getFacingTarget(): { x: number; y: number } {
    if (this.player.facing === 'up') {
      return { x: this.player.x, y: this.player.y - 1 };
    }

    if (this.player.facing === 'down') {
      return { x: this.player.x, y: this.player.y + 1 };
    }

    if (this.player.facing === 'left') {
      return { x: this.player.x - 1, y: this.player.y };
    }

    return { x: this.player.x + 1, y: this.player.y };
  }

  private getDoorName(color: 'yellow' | 'blue' | 'red'): string {
    if (color === 'yellow') {
      return '黄门';
    }

    if (color === 'blue') {
      return '蓝门';
    }

    return '红门';
  }

  private showMessage(text: string): void {
    this.message = text;
    if (this.messageTimer) {
      window.clearTimeout(this.messageTimer);
    }

    this.messageTimer = window.setTimeout(() => {
      this.message = '';
      this.render();
    }, 1800);
  }
}
