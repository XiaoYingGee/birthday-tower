import type { DoorColor, ItemType } from './floor';

export interface Inventory {
  redPotion: number;
  bluePotion: number;
  yellow: number;
  blue: number;
  red: number;
}

export interface PlayerState {
  x: number;
  y: number;
  visualX: number;
  visualY: number;
  hp: number;
  atk: number;
  def: number;
  gold: number;
  exp: number;
  inventory: Inventory;
  dir: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
  walkFrame: 0 | 1 | 2;
  walkFrameTimer: number;
}

export function createPlayer(x: number, y: number): PlayerState {
  return {
    x,
    y,
    visualX: x * 32,
    visualY: y * 32,
    hp: 100,
    atk: 12,
    def: 6,
    gold: 0,
    exp: 0,
    inventory: {
      redPotion: 0,
      bluePotion: 0,
      yellow: 0,
      blue: 0,
      red: 0,
    },
    dir: 'down',
    isMoving: false,
    walkFrame: 0,
    walkFrameTimer: 0,
  };
}

export function applyItem(player: PlayerState, item: ItemType): string {
  switch (item) {
    case 'yellowKey':
      player.inventory.yellow += 1;
      return '拿到黄钥匙';
    case 'blueKey':
      player.inventory.blue += 1;
      return '拿到蓝钥匙';
    case 'redKey':
      player.inventory.red += 1;
      return '拿到红钥匙';
    case 'redPotion':
      player.inventory.redPotion += 1;
      return '拿到红药水，按 E / 物品 使用';
    case 'bluePotion':
      player.inventory.bluePotion += 1;
      return '拿到蓝药水，按 E / 物品 使用';
    case 'gem':
      player.atk += 2;
      player.def += 2;
      return '宝石发光，攻击+2 防御+2';
  }
}

export function consumeDoorKey(player: PlayerState, color: DoorColor): boolean {
  if (color === 'yellow' && player.inventory.yellow > 0) {
    player.inventory.yellow -= 1;
    return true;
  }

  if (color === 'blue' && player.inventory.blue > 0) {
    player.inventory.blue -= 1;
    return true;
  }

  if (color === 'red' && player.inventory.red > 0) {
    player.inventory.red -= 1;
    return true;
  }

  return false;
}

export function useInventoryItem(player: PlayerState): string {
  if (player.inventory.redPotion > 0) {
    player.inventory.redPotion -= 1;
    player.hp += 25;
    return '喝下红药水，HP +25';
  }

  if (player.inventory.bluePotion > 0) {
    player.inventory.bluePotion -= 1;
    player.atk += 3;
    return '喝下蓝药水，攻击 +3';
  }

  return '背包里没有可用物品';
}
