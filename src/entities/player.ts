import type { DoorColor, ItemType } from '../data/floor';
import { CONFIG } from '../data/config';

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

export function createPlayer(x: number, y: number): PlayerState {
  const p = CONFIG.player;
  return {
    x,
    y,
    visualX: x * 32,
    visualY: y * 32,
    hp: p.hp,
    atk: p.atk,
    def: p.def,
    gold: p.gold,
    exp: p.exp,
    level: p.level,
    yellowKeys: p.yellowKeys,
    blueKeys: p.blueKeys,
    redKeys: p.redKeys,
    dir: 'down',
    isMoving: false,
    walkFrame: 0,
    walkFrameTimer: 0,
  };
}

export function checkLevelUp(player: PlayerState): string[] {
  const lv = CONFIG.levelUp;
  const messages: string[] = [];
  while (player.exp >= lv.expRequired) {
    player.exp -= lv.expRequired;
    player.level += 1;
    player.hp += lv.hpGain;
    player.atk += lv.atkGain;
    player.def += lv.defGain;
    messages.push(`升级！Lv${player.level} HP+${lv.hpGain} 攻+${lv.atkGain} 防+${lv.defGain}`);
  }
  return messages;
}

export function applyItem(player: PlayerState, item: ItemType): string {
  const items = CONFIG.items;
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
      player.hp += items.redPotion.hp;
      return `红药水 HP+${items.redPotion.hp}`;
    case 'bluePotion':
      player.hp += items.bluePotion.hp;
      return `蓝药水 HP+${items.bluePotion.hp}`;
    case 'redGem':
      player.atk += items.redGem.atk;
      return `红宝石 攻+${items.redGem.atk}`;
    case 'blueGem':
      player.def += items.blueGem.def;
      return `蓝宝石 防+${items.blueGem.def}`;
    case 'treasure':
      player.atk *= items.treasureMultiplier;
      player.def *= items.treasureMultiplier;
      return `★ 神秘宝物！攻/防 全部×${items.treasureMultiplier}！`;
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
