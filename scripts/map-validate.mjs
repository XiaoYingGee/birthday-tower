#!/usr/bin/env node
/**
 * map-validate.mjs — BFS 可达性验证器 v4
 * 验证每层地图满足设计约束：
 *   1. 主路可达性（不开门能到哪里）
 *   2. 钥匙 < 门（强制取舍）
 *   3. 关键道具在门后或主路必经
 *   4. 商人在主路（不开门可达）
 *   5. ★ 在 L2 红门后
 */

const FLOORS = [
  {
    name: 'L1 教学层',
    map: [
      '#############',
      '#@..Z..y..Z.#',
      '#.###.###.#.#',
      '#.#.......#.#',
      '#.#.#####.#.#',
      '#.Z.#...#.Z.#',
      '#.#.#.#.#.#.#',
      '#.#.h.#...#.#',
      '#.#.#####.#.#',
      '#.#.y.....#.#',
      '#.#.#####Y#.#',
      '#.r.......U.#',
      '#############',
    ],
    start: '@',
    keyItems: { y: 'yellowKey', r: 'redKey' },
    doors: { Y: 'yellowDoor' },
    mustReachNoDoor: ['Z', 'y', 'h', 'r'],
    mustReachWithDoor: ['U'],
    mustBehindDoor: [],
    merchantOnMainPath: false,
    checks: {
      yellowKeys: 2, yellowDoors: 1,
      blueKeys: 0, blueDoors: 0,
      redKeys: 1, redDoors: 0,
    },
  },
  {
    name: 'L2 白骨回廊',
    map: [
      '#############',
      '#D..K..h..K.#',
      '#.#########.#',
      '#...........#',
      '#.#########.#',
      '#.K...b...K.#',
      '#.####.####.#',
      '#....#R#....#',
      '#....#T#....#',
      '#....###.y..#',
      '#.######B##.#',
      '#......#d#U.#',
      '#############',
    ],
    start: 'D',
    keyItems: { y: 'yellowKey', b: 'blueKey' },
    doors: { B: 'blueDoor', R: 'redDoor' },
    mustReachNoDoor: ['K', 'h', 'b', 'y', 'U'],
    mustReachWithDoor: [],
    mustBehindDoor: [{ item: 'd', door: 'blue' }, { item: 'T', door: 'red' }],
    merchantOnMainPath: false,
    checks: {
      yellowKeys: 1, yellowDoors: 0,
      blueKeys: 1, blueDoors: 1,
      redKeys: 0, redDoors: 1,
    },
  },
  {
    name: 'L3 商人之厅',
    map: [
      '#############',
      '#D..F..S..F.#',
      '#.#########.#',
      '#...........#',
      '#.####Y####.#',
      '#.#..H..#...#',
      '#.#######.#.#',
      '#.F.......#.#',
      '#.####Y####.#',
      '#.#..a..#...#',
      '#.#######.Y.#',
      '#.F.......U.#',
      '#############',
    ],
    start: 'D',
    keyItems: {},
    doors: { Y: 'yellowDoor' },
    mustReachNoDoor: ['F', 'S'],
    mustReachWithDoor: ['U'],
    mustBehindDoor: [{ item: 'H', door: 'yellow' }, { item: 'a', door: 'yellow' }],
    merchantOnMainPath: true,
    checks: {
      yellowKeys: 0, yellowDoors: 3,
      blueKeys: 0, blueDoors: 0,
      redKeys: 0, redDoors: 0,
    },
  },
  {
    name: 'L4 火花工坊',
    map: [
      '#############',
      '#D..W.....h.#',
      '#.#########.#',
      '#...........#',
      '#.####B####.#',
      '#.#..H..#...#',
      '#.#######.#.#',
      '#.W.......#.#',
      '#.####Y####.#',
      '#.#..a..#.b.#',
      '#.#######.#.#',
      '#.W...y...U.#',
      '#############',
    ],
    start: 'D',
    keyItems: { y: 'yellowKey', b: 'blueKey' },
    doors: { Y: 'yellowDoor', B: 'blueDoor' },
    mustReachNoDoor: ['W', 'h', 'y', 'b', 'U'],
    mustReachWithDoor: [],
    mustBehindDoor: [{ item: 'H', door: 'blue' }, { item: 'a', door: 'yellow' }],
    merchantOnMainPath: false,
    checks: {
      yellowKeys: 1, yellowDoors: 1,
      blueKeys: 1, blueDoors: 1,
      redKeys: 0, redDoors: 0,
    },
  },
  {
    name: 'L5 末影长廊',
    map: [
      '#############',
      '#D..E..#..H.#',
      '#.####.#.##.#',
      '#......#..a.#',
      '#.####.#.##.#',
      '#.E....Y..d.#',
      '#.####.######',
      '#...........#',
      '#.#########.#',
      '#...........#',
      '#.#########.#',
      '#.....y...U.#',
      '#############',
    ],
    start: 'D',
    keyItems: { y: 'yellowKey' },
    doors: { Y: 'yellowDoor' },
    mustReachNoDoor: ['E', 'y', 'U'],
    mustReachWithDoor: [],
    mustBehindDoor: [{ item: 'H', door: 'yellow' }, { item: 'a', door: 'yellow' }, { item: 'd', door: 'yellow' }],
    merchantOnMainPath: false,
    checks: {
      yellowKeys: 1, yellowDoors: 1,
      blueKeys: 0, blueDoors: 0,
      redKeys: 0, redDoors: 0,
    },
  },
  {
    name: 'L6 BOSS 决战',
    map: [
      '#############',
      '#####...#####',
      '####.....####',
      '###.......###',
      '##....X....##',
      '###.......###',
      '####.....####',
      '####.....####',
      '####.....####',
      '####.....####',
      '####.....####',
      '####..D..####',
      '#############',
    ],
    start: 'D',
    keyItems: {},
    doors: {},
    mustReachNoDoor: ['X'],
    mustReachWithDoor: [],
    mustBehindDoor: [],
    merchantOnMainPath: false,
    checks: {
      yellowKeys: 0, yellowDoors: 0,
      blueKeys: 0, blueDoors: 0,
      redKeys: 0, redDoors: 0,
    },
  },
];

const WALL = '#';
const DOOR_CHARS = new Set(['Y', 'B', 'R']);

function parseMap(lines) {
  return lines.map(l => l.split(''));
}

function findAll(grid, ch) {
  const result = [];
  for (let y = 0; y < grid.length; y++)
    for (let x = 0; x < grid[y].length; x++)
      if (grid[y][x] === ch) result.push([x, y]);
  return result;
}

function findFirst(grid, ch) {
  for (let y = 0; y < grid.length; y++)
    for (let x = 0; x < grid[y].length; x++)
      if (grid[y][x] === ch) return [x, y];
  return null;
}

function bfs(grid, sx, sy, blockers = DOOR_CHARS) {
  const h = grid.length, w = grid[0].length;
  const visited = Array.from({ length: h }, () => Array(w).fill(false));
  const queue = [[sx, sy]];
  visited[sy][sx] = true;
  const reach = new Set([`${sx},${sy}`]);
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (visited[ny][nx]) continue;
      const ch = grid[ny][nx];
      if (ch === WALL || blockers.has(ch)) continue;
      visited[ny][nx] = true;
      reach.add(`${nx},${ny}`);
      queue.push([nx, ny]);
    }
  }
  return reach;
}

function bfsOpenDoor(grid, sx, sy, doorChar) {
  const reduced = new Set(DOOR_CHARS);
  reduced.delete(doorChar);
  return bfs(grid, sx, sy, reduced);
}

function bfsOpenSpecificDoor(grid, sx, sy, doorX, doorY) {
  const grid2 = grid.map(r => [...r]);
  grid2[doorY][doorX] = '.';
  return bfs(grid2, sx, sy, DOOR_CHARS);
}

let allPassed = true;

for (const floor of FLOORS) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${floor.name}`);
  console.log('='.repeat(50));

  const grid = parseMap(floor.map);
  const h = grid.length, w = grid[0].length;

  // Validate dimensions
  if (h !== 13 || w !== 13) {
    console.log(`  ❌ 尺寸错误: ${w}×${h}（期望 13×13）`);
    allPassed = false;
    continue;
  }
  console.log(`  ✅ 尺寸: 13×13`);

  // Find start
  const start = findFirst(grid, floor.start);
  if (!start) {
    console.log(`  ❌ 找不到起点 '${floor.start}'`);
    allPassed = false;
    continue;
  }
  console.log(`  ✅ 起点: (${start[0]},${start[1]})`);

  // BFS without opening any doors
  const reachNoDoor = bfs(grid, start[0], start[1]);
  console.log(`  📊 不开门可达格数: ${reachNoDoor.size}`);

  // Check mustReachNoDoor
  let noDoorOk = true;
  for (const ch of floor.mustReachNoDoor) {
    const positions = findAll(grid, ch);
    for (const [px, py] of positions) {
      const ok = reachNoDoor.has(`${px},${py}`);
      if (!ok) {
        console.log(`  ❌ ${ch}(${px},${py}) 不开门不可达`);
        noDoorOk = false;
        allPassed = false;
      }
    }
  }
  if (noDoorOk) console.log(`  ✅ 不开门可达: ${floor.mustReachNoDoor.join(', ')}`);

  // Check mustBehindDoor
  let behindOk = true;
  for (const { item, door } of floor.mustBehindDoor) {
    const positions = findAll(grid, item);
    for (const [px, py] of positions) {
      const inReach = reachNoDoor.has(`${px},${py}`);
      if (inReach) {
        console.log(`  ❌ ${item}(${px},${py}) 应该在 ${door} 门后，但不开门就能拿到`);
        behindOk = false;
        allPassed = false;
      }
    }
  }
  if (behindOk && floor.mustBehindDoor.length > 0) {
    console.log(`  ✅ 门后道具: ${floor.mustBehindDoor.map(b => b.item).join(', ')}`);
  }

  // Check merchant on main path
  if (floor.merchantOnMainPath) {
    const sPos = findFirst(grid, 'S');
    if (sPos && reachNoDoor.has(`${sPos[0]},${sPos[1]}`)) {
      console.log(`  ✅ 商人 S(${sPos[0]},${sPos[1]}) 在主路上`);
    } else if (sPos) {
      console.log(`  ❌ 商人 S(${sPos[0]},${sPos[1]}) 不在主路上（需开门才能到）`);
      allPassed = false;
    } else {
      console.log(`  ❌ 找不到商人 S`);
      allPassed = false;
    }
  }

  // Count keys and doors
  const counts = {
    yellowKeys: findAll(grid, 'y').length,
    yellowDoors: findAll(grid, 'Y').length,
    blueKeys: findAll(grid, 'b').length,
    blueDoors: findAll(grid, 'B').length,
    redKeys: findAll(grid, 'r').length,
    redDoors: findAll(grid, 'R').length,
  };

  let countOk = true;
  for (const [key, expected] of Object.entries(floor.checks)) {
    if (counts[key] !== expected) {
      console.log(`  ❌ ${key}: 实际 ${counts[key]}，期望 ${expected}`);
      countOk = false;
      allPassed = false;
    }
  }
  if (countOk) {
    console.log(`  ✅ 钥匙/门数量: 黄${counts.yellowKeys}/${counts.yellowDoors} 蓝${counts.blueKeys}/${counts.blueDoors} 红${counts.redKeys}/${counts.redDoors}`);
  }

  // Check that exits exist (U or X for L6)
  const upStair = findFirst(grid, 'U');
  const boss = findFirst(grid, 'X');
  if (!upStair && !boss) {
    console.log(`  ❌ 找不到出口（U 或 X）`);
    allPassed = false;
  }

  // For floors with doors, check that opening the correct door makes blocked items reachable
  for (const { item, door } of floor.mustBehindDoor) {
    const doorCharMap = { yellow: 'Y', blue: 'B', red: 'R' };
    const doorChar = doorCharMap[door];
    if (!doorChar) { console.log(`  ❌ 未知门类型: ${door}`); allPassed = false; continue; }
    const doorPositions = findAll(grid, doorChar);
    const itemPositions = findAll(grid, item);

    for (const [ix, iy] of itemPositions) {
      let canReach = false;
      for (const [dx, dy] of doorPositions) {
        const reachWithDoor = bfsOpenSpecificDoor(grid, start[0], start[1], dx, dy);
        if (reachWithDoor.has(`${ix},${iy}`)) {
          canReach = true;
          break;
        }
      }
      if (!canReach) {
        console.log(`  ❌ ${item}(${ix},${iy}) 开 ${doorChar} 门后仍不可达`);
        allPassed = false;
      } else {
        console.log(`  ✅ ${item}(${ix},${iy}) 开 ${doorChar} 门后可达`);
      }
    }
  }
}

// Global cross-floor key balance check
console.log(`\n${'='.repeat(50)}`);
console.log('  全局钥匙平衡检查');
console.log('='.repeat(50));

let totalYellowKeys = 0, totalYellowDoors = 0;
let totalBlueKeys = 0, totalBlueDoors = 0;
let totalRedKeys = 0, totalRedDoors = 0;

for (const floor of FLOORS) {
  const grid = parseMap(floor.map);
  totalYellowKeys += findAll(grid, 'y').length;
  totalYellowDoors += findAll(grid, 'Y').length;
  totalBlueKeys += findAll(grid, 'b').length;
  totalBlueDoors += findAll(grid, 'B').length;
  totalRedKeys += findAll(grid, 'r').length;
  totalRedDoors += findAll(grid, 'R').length;
}

console.log(`  黄钥匙 ${totalYellowKeys} vs 黄门 ${totalYellowDoors} → ${totalYellowKeys < totalYellowDoors ? '✅ 钥匙<门（取舍）' : '❌ 钥匙≥门（无取舍）'}`);
console.log(`  蓝钥匙 ${totalBlueKeys} vs 蓝门 ${totalBlueDoors} → ${totalBlueKeys <= totalBlueDoors ? '✅ 钥匙≤门' : '❌ 钥匙>门'}`);
console.log(`  红钥匙 ${totalRedKeys} vs 红门 ${totalRedDoors} → ${totalRedKeys <= totalRedDoors ? '✅ 钥匙≤门' : '❌ 钥匙>门'}`);

if (totalYellowKeys >= totalYellowDoors) allPassed = false;
if (totalBlueKeys > totalBlueDoors) allPassed = false;
if (totalRedKeys > totalRedDoors) allPassed = false;

console.log(`\n${'='.repeat(50)}`);
console.log(`  总评: ${allPassed ? '✅✅✅ 全部验证通过！' : '❌ 存在问题，需修改地图'}`);
console.log('='.repeat(50));

process.exit(allPassed ? 0 : 1);
