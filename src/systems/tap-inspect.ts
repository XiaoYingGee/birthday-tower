import type { GameContext } from '../core/game-context';
import type { Renderer } from '../render/renderer';
import { estimateBattle, MONSTERS } from '../entities/monster';
import { HERO_QUOTES, MERCHANT_QUOTES, PRINCESS_QUOTES } from '../data/quotes';

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
  canvas.addEventListener('click', (e) => {
    const pos = renderer.screenToGrid(e.clientX, e.clientY);
    if (!pos) return;

    if (pos.x === ctx.player.x && pos.y === ctx.player.y) {
      ctx.showMessage(HERO_QUOTES[Math.floor(Math.random() * HERO_QUOTES.length)]);
      return;
    }

    const cell = ctx.currentFloor.grid[pos.y]?.[pos.x];
    if (!cell) return;

    if (cell.monster) {
      const m = MONSTERS[cell.monster];
      const est = estimateBattle(ctx.player.hp, ctx.player.atk, ctx.player.def, cell.monster);
      const dmgText = est.fatal ? '⚠必败' : est.damageTaken === 0 ? '无伤' : `-${est.damageTaken}HP`;
      ctx.showMessage(`${m.name}（HP${m.hp}/攻${m.atk}/防${m.def}）${dmgText}`);
      return;
    }

    if (cell.merchant) {
      ctx.showMessage(MERCHANT_QUOTES[Math.floor(Math.random() * MERCHANT_QUOTES.length)]);
      return;
    }

    if (cell.princess) {
      ctx.showMessage(PRINCESS_QUOTES[Math.floor(Math.random() * PRINCESS_QUOTES.length)]);
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
