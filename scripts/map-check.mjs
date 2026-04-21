#!/usr/bin/env node
/**
 * 地图可达性 + 取舍验证器 v2
 * 把门视作"需要钥匙"（默认不可走）
 * 模拟玩家携带 N 把钥匙 → 找出能开门组合 → 检查能否拿到关键道具
 */

const WALL = '#';
const DOOR = 'Y';

function isOpenSpace(ch) {
  // 默认可走：除墙、门外的一切
  return ch !== WALL && ch !== DOOR;
}

function bfs(map, startX, startY) {
  const h = map.length;
  const w = map[0].length;
  const visited = Array.from({length: h}, () => Array(w).fill(false));
  const queue = [[startX, startY]];
  visited[startY][startX] = true;
  const reach = new Set([`${startX},${startY}`]);
  
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx<0||nx>=w||ny<0||ny>=h) continue;
      if (visited[ny][nx]) continue;
      if (!isOpenSpace(map[ny][nx])) continue;
      visited[ny][nx] = true;
      reach.add(`${nx},${ny}`);
      queue.push([nx, ny]);
    }
  }
  return reach;
}

function findFirst(map, ch) {
  for (let y=0; y<map.length; y++)
    for (let x=0; x<map[y].length; x++)
      if (map[y][x] === ch) return [x, y];
  return null;
}

function findAll(map, ch) {
  const list = [];
  for (let y=0; y<map.length; y++)
    for (let x=0; x<map[y].length; x++)
      if (map[y][x] === ch) list.push([x, y]);
  return list;
}

function adjacent(reach, [x, y]) {
  // 是否有任一邻格在 reach 内（即门是从可达区"够得到"的）
  return [[0,-1],[0,1],[-1,0],[1,0]].some(([dx,dy]) => reach.has(`${x+dx},${y+dy}`));
}

function check(name, mapStr, items) {
  const map = mapStr.trim().split('\n').filter(l => l.trim()).map(l => l.split(''));
  console.log(`\n========== ${name} ==========`);
  
  const start = findFirst(map, '@') || findFirst(map, 'D');
  console.log(`起点 ${start}`);
  
  // 不开任何门的可达区
  const reach0 = bfs(map, start[0], start[1]);
  
  // 找所有门 + 它们的"位置可达性"（是否邻接 reach0）
  const doors = findAll(map, DOOR);
  console.log(`\n门数: ${doors.length}`);
  for (const [x, y] of doors) {
    const nearby = adjacent(reach0, [x, y]);
    console.log(`  门(${x},${y}): ${nearby ? '可触及' : '需先开其他门才能到'}`);
  }
  
  // 关键道具：是否在 reach0（不开门可拿）vs 必须开门拿
  console.log(`\n道具/目标可达性（不开任何门）:`);
  for (const [name, ch] of Object.entries(items)) {
    const positions = findAll(map, ch);
    for (const [x, y] of positions) {
      const inReach = reach0.has(`${x},${y}`);
      console.log(`  ${inReach ? '🆓' : '🔒'} ${name}(${ch}) @(${x},${y}): ${inReach ? '直接可拿' : '需开门'}`);
    }
  }
  
  // 模拟开 1 把钥匙（贪心：每道门轮流开，看新增可达）
  console.log(`\n开 1 把钥匙时各道门带来的新可达数量:`);
  for (const [dx, dy] of doors) {
    if (!adjacent(reach0, [dx, dy])) {
      console.log(`  门(${dx},${dy}): 跳过（需先开其他门）`);
      continue;
    }
    // 假装开了这道门：把它变成空地
    const map2 = map.map(r => [...r]);
    map2[dy][dx] = '.';
    const reach1 = bfs(map2, start[0], start[1]);
    const newCells = [...reach1].filter(c => !reach0.has(c));
    console.log(`  开门(${dx},${dy}) → 新增 ${newCells.length} 格可达`);
  }
}

// ============================================================
// 重新设计的 6 层（每层 11×11）
// 核心原则：单条主路 + 门后岛屿（必开门才能进）
// ============================================================

// L1 教学层：3 僵尸路 + 1 黄钥匙 + 1 黄门 + 1 红药（门后）
const L1 = `
###########
#@.Z.Z.Z..#
#.#######.#
#.........#
#.#######.#
#.....y...#
#.#######.#
#....Y....#
#.###h###.#
#........U#
###########
`;
// 主路：@(1,1) → 走顶层 Z区 → 下到 (1,3) 大厅 → 拿 y(6,5) → 开 Y(5,7) → 拿 h(5,8) → ?
// 但 h 在门后必须先开 Y 才能拿，黄钥匙只 1 把，还要留给后面层吗？
// 嗯，每层钥匙不留给下一层简化逻辑

check('L1', L1, { 红药: 'h', 黄钥匙: 'y', 黄门: 'Y', 上楼: 'U', 僵尸: 'Z' });

// L2 ★陷阱：黄门后是 ★ + 蓝宝石(d) 也在某个房间
const L2 = `
###########
#D.K.K.K..#
#.#######.#
#.........#
#.#######.#
#....h....#
#.#######.#
#.y.Y.Y.★.#
#.###d###.#
#........U#
###########
`;
// 1 把黄钥匙 + 2 道门：必须取舍开哪道
// 左 Y → d（蓝宝石+10防 必拿）
// 右 Y → ★ （陷阱！别开）
check('L2', L2, { 骷髅: 'K', 红药: 'h', 蓝宝石: 'd', 黄门: 'Y', 神宝: '★', 上楼: 'U' });

// L3 商人层：2 把黄钥匙 + 3 道门 → 选 2 道开
const L3 = `
###########
#D.B.S.B..#
#.#######.#
#.........#
#.#######.#
#.y.....y.#
#.#######.#
#.H.Y.Y.Y.#
#.###a###.#
#........U#
###########
`;
// S 商人在主路（1,3 起，走顶层 → 撞 S(3,1)）
// 3 道门：
//   左 Y(2,7) → H 蓝药 +150HP
//   中 Y(4,7) → a 红宝石 +10攻 （应该是单独房间，这里图错了）
//   右 Y(6,7) → 通往别的
// 让我重画
check('L3', L3, { 蝙蝠: 'B', 商人: 'S', 蓝药: 'H', 红宝石: 'a', 黄钥匙: 'y', 黄门: 'Y', 上楼: 'U' });
