import type { Cell, FloorDefinition } from '../data/floor';
import type { GameContext } from '../core/game-context';
import { applyItem, checkLevelUp } from '../entities/player';

export function resolveCellArrival(ctx: GameContext, cell: Cell): void {
  if (cell.item) {
    const item = cell.item;
    cell.item = undefined;
    ctx.showMessage(applyItem(ctx.player, item));
    const lvMsgs = checkLevelUp(ctx.player);
    for (const msg of lvMsgs) {
      ctx.showMessage(msg);
    }
    ctx.save();
  }

  handleStair(ctx, cell);
}

export function handleStair(ctx: GameContext, cell: Cell): void {
  if (cell.terrain === 'stair-up') {
    if (ctx.floorIndex >= ctx.floors.length - 1) {
      ctx.showMessage('前方已经没有更高的楼层');
      return;
    }

    const fromX = ctx.player.x;
    const fromY = ctx.player.y;
    ctx.floorIndex += 1;
    const floor = ctx.currentFloor;
    if (floor.starts.length > 0) {
      const nearest = findNearestPoint(floor.starts, fromX, fromY);
      ctx.placePlayer(nearest.x, nearest.y);
    } else {
      const downStair = findNearestStair(floor, 'stair-down', fromX, fromY);
      const adj = findAdjacentFloor(floor, downStair.x, downStair.y);
      ctx.placePlayer(adj.x, adj.y);
    }
    ctx.showMessage(`${ctx.currentFloor.name}`);
    ctx.save();
    return;
  }

  if (cell.terrain === 'stair-down') {
    if (ctx.floorIndex === 0) {
      ctx.showMessage('这里已经是第一层');
      return;
    }

    const fromX = ctx.player.x;
    const fromY = ctx.player.y;
    ctx.floorIndex -= 1;
    const floor = ctx.currentFloor;
    if (floor.comeDowns.length > 0) {
      const nearest = findNearestPoint(floor.comeDowns, fromX, fromY);
      ctx.placePlayer(nearest.x, nearest.y);
    } else {
      const upStair = findNearestStair(floor, 'stair-up', fromX, fromY);
      const adj = findAdjacentFloor(floor, upStair.x, upStair.y);
      ctx.placePlayer(adj.x, adj.y);
    }
    ctx.showMessage(`${ctx.currentFloor.name}`);
    ctx.save();
  }
}

export function findNearestStair(floor: FloorDefinition, terrain: 'stair-up' | 'stair-down', fromX: number, fromY: number): { x: number; y: number } {
  const candidates: { x: number; y: number }[] = [];
  for (let y = 0; y < floor.grid.length; y += 1) {
    for (let x = 0; x < floor.grid[y].length; x += 1) {
      if (floor.grid[y][x].terrain === terrain) {
        candidates.push({ x, y });
      }
    }
  }
  if (candidates.length === 0) {
    throw new Error(`Failed to find ${terrain} on floor ${floor.id}.`);
  }
  return findNearestPoint(candidates, fromX, fromY);
}

export function findNearestPoint(points: { x: number; y: number }[], fromX: number, fromY: number): { x: number; y: number } {
  let best = points[0];
  let bestDist = Math.abs(best.x - fromX) + Math.abs(best.y - fromY);
  for (let i = 1; i < points.length; i += 1) {
    const dist = Math.abs(points[i].x - fromX) + Math.abs(points[i].y - fromY);
    if (dist < bestDist) {
      best = points[i];
      bestDist = dist;
    }
  }
  return best;
}

export function findAdjacentFloor(floor: FloorDefinition, sx: number, sy: number): { x: number; y: number } {
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (const [dx, dy] of dirs) {
    const nx = sx + dx;
    const ny = sy + dy;
    const cell = floor.grid[ny]?.[nx];
    if (cell && cell.terrain === 'floor' && !cell.monster && !cell.door && !cell.merchant && !cell.princess) {
      return { x: nx, y: ny };
    }
  }
  return { x: sx, y: sy };
}
