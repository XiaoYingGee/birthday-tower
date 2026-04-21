import type { GameContext } from '../core/game-context';
import type { Renderer } from '../render/renderer';
import { estimateBattle, MONSTERS } from '../entities/monster';
import { HERO_QUOTES, MERCHANT_QUOTES, PRINCESS_QUOTES, FAIRY_QUOTES, KEY_MERCHANT_QUOTES, BOSS_QUOTES } from '../data/quotes';

const ITEM_DESC: Record<string, string> = {
  redPotion: '红药水：HP+50',
  bluePotion: '蓝药水：HP+150',
  redGem: '红宝石：攻击+3',
  blueGem: '蓝宝石：防御+3',
  treasure: '★神秘宝物：HP/攻/防全部×2',
  yellowKey: '黄钥匙：开启黄色门',
  blueKey: '蓝钥匙：开启蓝色门',
  redKey: '红钥匙：开启红色门',
};

export function setupTapInspect(canvas: HTMLCanvasElement, renderer: Renderer, ctx: GameContext): void {
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  canvas.addEventListener('click', (e) => {
    const pos = renderer.screenToGrid(e.clientX, e.clientY);
    if (!pos) return;

    if (pos.x === ctx.player.x && pos.y === ctx.player.y) {
      ctx.showMessage(`${ctx.playerName}：${pick(HERO_QUOTES)}`);
      return;
    }

    const cell = ctx.currentFloor.grid[pos.y]?.[pos.x];
    if (!cell) return;

    if (cell.monster) {
      if (cell.monster === 'wither') {
        ctx.showMessage(`龙王：${pick(BOSS_QUOTES)}`);
        return;
      }
      const m = MONSTERS[cell.monster];
      const est = estimateBattle(ctx.player.hp, ctx.player.atk, ctx.player.def, cell.monster);
      const dmgText = est.fatal ? '⚠必败' : est.damageTaken === 0 ? '无伤' : `-${est.damageTaken}HP`;
      ctx.showMessage(`${m.name}（HP${m.hp}/攻${m.atk}/防${m.def}）${dmgText}`);
      return;
    }

    if (cell.merchant) {
      ctx.showMessage(`商人：${pick(MERCHANT_QUOTES)}`);
      return;
    }

    if (cell.princess) {
      ctx.showMessage(`公主：${pick(PRINCESS_QUOTES)}`);
      return;
    }

    if (cell.fairy) {
      ctx.showMessage(`仙子：${pick(FAIRY_QUOTES)}`);
      return;
    }

    if (cell.keyShop) {
      ctx.showMessage(`钥匙商人：${pick(KEY_MERCHANT_QUOTES)}`);
      return;
    }

    if (cell.item) {
      const desc = ITEM_DESC[cell.item];
      if (desc) ctx.showMessage(desc);
      return;
    }

    if (cell.door) {
      const names = { yellow: '黄门', blue: '蓝门', red: '红门' };
      ctx.showMessage(`${names[cell.door]}：需要对应颜色的钥匙`);
    }
  });
}
