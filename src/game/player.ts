import type { DoorColor, ItemType } from './floor';

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
  level: number;
  yellowKeys: number;
  blueKeys: number;
  redKeys: number;
  dir: 'up' | 'down' | 'left' | 'right';
  isMoving: boolean;
  walkFrame: 0 | 1 | 2;
  walkFrameTimer: number;
}

const LEVEL_UP_EXP = 100;

export function createPlayer(x: number, y: number): PlayerState {
  return {
    x,
    y,
    visualX: x * 32,
    visualY: y * 32,
    hp: 100,
    atk: 10,
    def: 10,
    gold: 0,
    exp: 0,
    level: 1,
    yellowKeys: 0,
    blueKeys: 0,
    redKeys: 0,
    dir: 'down',
    isMoving: false,
    walkFrame: 0,
    walkFrameTimer: 0,
  };
}

export function checkLevelUp(player: PlayerState): string[] {
  const messages: string[] = [];
  while (player.exp >= LEVEL_UP_EXP) {
    player.exp -= LEVEL_UP_EXP;
    player.level += 1;
    player.hp += 100;
    player.atk += 5;
    player.def += 5;
    messages.push(`升级！Lv${player.level} HP+100 攻+5 防+5`);
  }
  return messages;
}

export function applyItem(player: PlayerState, item: ItemType): string {
  switch (item) {
    case 'yellowKey':
      player.yellowKeys += 1;
      return '拿到黄钥匙';
    case 'blueKey':
      player.blueKeys += 1;
      return '拿到蓝钥匙';
    case 'redKey':
      player.redKeys += 1;
      return '拿到红钥匙';
    case 'redPotion':
      player.hp += 50;
      return '红药水 HP+50';
    case 'bluePotion':
      player.hp += 150;
      return '蓝药水 HP+150';
    case 'redGem':
      player.atk += 10;
      return '红宝石 攻+10';
    case 'blueGem':
      player.def += 10;
      return '蓝宝石 防+10';
    case 'treasure':
      player.hp *= 2;
      player.atk *= 2;
      player.def *= 2;
      return '★ 神秘宝物！HP/攻/防 全部翻倍！';
  }
}

export function consumeDoorKey(player: PlayerState, color: DoorColor): boolean {
  if (color === 'yellow' && player.yellowKeys > 0) {
    player.yellowKeys -= 1;
    return true;
  }
  if (color === 'blue' && player.blueKeys > 0) {
    player.blueKeys -= 1;
    return true;
  }
  if (color === 'red' && player.redKeys > 0) {
    player.redKeys -= 1;
    return true;
  }
  return false;
}
