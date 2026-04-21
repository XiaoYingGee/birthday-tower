#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MONSTERS = {
  Z: { name: '僵尸',     hp: 15,   atk: 8,   def: 1,  gold: 6,  exp: 12 },
  K: { name: '骷髅',     hp: 30,   atk: 15,  def: 5,  gold: 10, exp: 18 },
  F: { name: '蝙蝠',     hp: 25,   atk: 16,  def: 3,  gold: 10, exp: 15 },
  W: { name: '巫师',     hp: 45,   atk: 22,  def: 8,  gold: 15, exp: 25 },
  E: { name: '暗黑骑士', hp: 70,   atk: 30,  def: 12, gold: 20, exp: 40 },
  X: { name: '龙王',     hp: 1500, atk: 120, def: 55, gold: 0,  exp: 0  },
};

const ITEMS = {
  h: { name: '红药+50HP',    apply: p => { p.hp += 50; } },
  H: { name: '蓝药+150HP',   apply: p => { p.hp += 150; } },
  a: { name: '红宝石+5攻',   apply: p => { p.atk += 5; } },
  d: { name: '蓝宝石+5防',   apply: p => { p.def += 5; } },
};

const DOORS = { Y: 'y', B: 'b', R: 'r' };
const DOOR_NAMES = { Y: '黄门', B: '蓝门', R: '红门' };
const KEY_NAMES = { y: '黄钥匙', b: '蓝钥匙', r: '红钥匙' };
const CHAR_NAMES = {
  ...Object.fromEntries(Object.entries(MONSTERS).map(([k, v]) => [k, v.name])),
  ...Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.name])),
  ...Object.fromEntries(Object.entries(DOOR_NAMES).map(([k, v]) => [k, v])),
  ...Object.fromEntries(Object.entries(KEY_NAMES).map(([k, v]) => [k, v])),
  '@': '玩家起点', U: '上楼梯',
};

function parseMap(filePath) {
  const raw = readFileSync(filePath, 'utf-8').trimEnd().split('\n');
  return raw.map(line => {
    const row = [];
    for (let i = 0; i < line.length; i += 2) row.push(line[i]);
    return row;
  });
}

function calcFight(player, ch) {
  const m = MONSTERS[ch];
  const playerHit = Math.max(1, player.atk - m.def);
  const monsterHit = Math.max(0, m.atk - player.def);
  const turns = Math.ceil(m.hp / playerHit);
  const damage = (turns - 1) * monsterHit;
  return { playerHit, monsterHit, turns, damage, canWin: player.hp > damage };
}

function doFight(player, ch) {
  const m = MONSTERS[ch];
  const f = calcFight(player, ch);
  if (!f.canWin) return null;
  const hpBefore = player.hp;
  player.hp -= f.damage;
  player.gold += m.gold;
  player.exp += m.exp;
  const lvlUps = [];
  while (player.exp >= 100) {
    player.exp -= 100; player.level++;
    player.hp += 100; player.atk += 5; player.def += 5;
    lvlUps.push(player.level);
  }
  return { ...f, hpBefore, lvlUps };
}

// DFS solver with state = (pos, keys, consumed entities, opened doors, player stats)
// Since full state space is huge, use iterative deepening with greedy heuristic
// Key insight: with 6Y doors and 5y keys, must skip exactly 1 Y door
// With 1B door and 3b keys, and 1R door and 2r keys, those are fine

function solve(grid) {
  const H = grid.length, W = grid[0].length;
  let start, exit;
  const allEntities = []; // {x,y,char,id}
  const allDoors = [];    // {x,y,char,id}

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const ch = grid[r][c];
      if (ch === '@') start = { x: c, y: r };
      if (ch === 'U') exit = { x: c, y: r };
      if (MONSTERS[ch] || ITEMS[ch] || KEY_NAMES[ch])
        allEntities.push({ x: c, y: r, char: ch, id: allEntities.length });
      if (DOORS[ch])
        allDoors.push({ x: c, y: r, char: ch, id: allDoors.length });
    }
  }

  const entityAt = new Map();
  for (const e of allEntities) entityAt.set(`${e.x},${e.y}`, e);
  const doorAt = new Map();
  for (const d of allDoors) doorAt.set(`${d.x},${d.y}`, d);

  // Try solving with DFS: at each step, flood-fill reachable zone,
  // try each possible next action (pick entity, open door)
  // Use memoization on (consumed set, opened doors set, player approx state)

  let bestResult = null;

  function runSim() {
    const consumed = new Set();
    const opened = new Set();
    const keys = { y: 0, b: 0, r: 0 };
    const player = { hp: 100, atk: 10, def: 10, gold: 0, exp: 0, level: 1 };
    let pos = { ...start };
    const eventLog = [];
    let stepN = 0;

    function isPassable(x, y) {
      if (x < 0 || x >= W || y < 0 || y >= H) return true === false;
      if (grid[y][x] === '#') return false;
      const d = doorAt.get(`${x},${y}`);
      if (d && !opened.has(d.id)) return false;
      return true;
    }

    function flood(from) {
      const vis = new Set();
      const par = new Map();
      const q = [from];
      vis.add(`${from.x},${from.y}`);
      par.set(`${from.x},${from.y}`, null);
      const adjDoors = [];

      while (q.length) {
        const c = q.shift();
        for (const [dx, dy] of [[0,-1],[0,1],[-1,0],[1,0]]) {
          const nx = c.x + dx, ny = c.y + dy;
          const k = `${nx},${ny}`;
          if (vis.has(k) || nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
          if (grid[ny][nx] === '#') continue;
          const d = doorAt.get(k);
          if (d && !opened.has(d.id)) {
            adjDoors.push({ ...d, parentKey: `${c.x},${c.y}` });
            continue;
          }
          vis.add(k);
          par.set(k, `${c.x},${c.y}`);
          q.push({ x: nx, y: ny });
        }
      }
      return { vis, par, adjDoors };
    }

    function pathTo(par, t) {
      const p = [];
      let k = `${t.x},${t.y}`;
      while (k) { const [x, y] = k.split(',').map(Number); p.unshift({ x, y }); k = par.get(k); }
      return p;
    }

    function sp(coords) {
      if (!coords || !coords.length) return '';
      if (coords.length <= 4) return coords.map(p => `(${p.x},${p.y})`).join('→');
      return `(${coords[0].x},${coords[0].y})→...→(${coords.at(-1).x},${coords.at(-1).y}) [${coords.length-1}步]`;
    }

    // Iterative: collect everything in zone, then open best door
    for (let iter = 0; iter < 500; iter++) {
      const { vis, par, adjDoors } = flood(pos);

      // Collect all reachable entities sorted: keys > items (potions before gems) > weakest monsters
      const reachable = [];
      for (const k of vis) {
        const e = entityAt.get(k);
        if (e && !consumed.has(e.id)) reachable.push(e);
      }

      // Sort priority
      reachable.sort((a, b) => {
        const pa = KEY_NAMES[a.char] ? 0 : ITEMS[a.char] ? 1 : 2;
        const pb = KEY_NAMES[b.char] ? 0 : ITEMS[b.char] ? 1 : 2;
        if (pa !== pb) return pa - pb;
        if (pa === 2) { // both monsters
          const da = calcFight(player, a.char).damage;
          const db = calcFight(player, b.char).damage;
          return da - db;
        }
        return 0;
      });

      // Process all reachable entities
      let processed = false;
      for (const e of reachable) {
        const coords = pathTo(par, e);
        if (KEY_NAMES[e.char]) {
          keys[e.char]++;
          consumed.add(e.id);
          stepN++;
          eventLog.push({ step: stepN, type: 'key', char: e.char, coords: sp(coords), keys: { ...keys } });
          pos = { x: e.x, y: e.y };
          processed = true;
          break;
        }
        if (ITEMS[e.char]) {
          const before = { hp: player.hp, atk: player.atk, def: player.def };
          ITEMS[e.char].apply(player);
          consumed.add(e.id);
          stepN++;
          eventLog.push({ step: stepN, type: 'item', char: e.char, coords: sp(coords), before, after: { hp: player.hp, atk: player.atk, def: player.def } });
          pos = { x: e.x, y: e.y };
          processed = true;
          break;
        }
        if (MONSTERS[e.char]) {
          const result = doFight(player, e.char);
          if (!result) continue;
          consumed.add(e.id);
          stepN++;
          eventLog.push({ step: stepN, type: 'fight', char: e.char, coords: sp(coords), result, player: { ...player } });
          pos = { x: e.x, y: e.y };
          processed = true;
          break;
        }
      }
      if (processed) continue;

      // Check if exit reachable
      if (vis.has(`${exit.x},${exit.y}`)) {
        stepN++;
        eventLog.push({ step: stepN, type: 'exit', coords: sp(pathTo(par, exit)) });
        return { success: true, eventLog, player: { ...player }, keys: { ...keys }, consumed: new Set(consumed) };
      }

      // Try opening a door
      const uniqueDoors = new Map();
      for (const d of adjDoors) {
        if (!uniqueDoors.has(d.id)) uniqueDoors.set(d.id, d);
      }

      let doorOpened = false;
      for (const [, d] of uniqueDoors) {
        const kt = DOORS[d.char];
        if (keys[kt] > 0) {
          keys[kt]--;
          opened.add(d.id);
          const adjCoords = pathTo(par, { x: parseInt(d.parentKey.split(',')[0]), y: parseInt(d.parentKey.split(',')[1]) });
          adjCoords.push({ x: d.x, y: d.y });
          stepN++;
          eventLog.push({ step: stepN, type: 'door', char: d.char, doorPos: `(${d.x},${d.y})`, coords: sp(adjCoords), keys: { ...keys } });
          pos = { x: d.x, y: d.y };
          doorOpened = true;
          break;
        }
      }
      if (doorOpened) continue;

      // Stuck
      eventLog.push({ step: ++stepN, type: 'stuck', reason: '无法到达出口，缺少钥匙或被门/墙阻挡' });
      return { success: false, eventLog, player: { ...player }, keys: { ...keys }, consumed: new Set(consumed) };
    }
    return { success: false, eventLog, player: { ...player }, keys: { ...keys }, consumed: new Set(consumed) };
  }

  // The greedy sim may fail because it opens the wrong door.
  // Strategy: try greedy first, if it fails, try DFS with door-choice backtracking.
  // For this map: 6Y doors, 5y keys → must skip 1 Y door.
  // Try all combinations of skipping 1 Y door and see which works.

  const yDoors = allDoors.filter(d => d.char === 'Y');

  // First try: no skip constraint (greedy)
  const greedyResult = runSim();
  if (greedyResult.success) return { ...greedyResult, allEntities, allDoors };

  // Try skipping each Y door (block it permanently)
  console.log(`\n[探索] 贪心策略失败，尝试跳过不同的黄门...`);
  console.log(`黄门列表: ${yDoors.map(d => `(${d.x},${d.y})`).join(', ')}`);

  for (const skipDoor of yDoors) {
    // Re-run sim but with this door permanently blocked (treat as wall)
    const savedChar = grid[skipDoor.y][skipDoor.x];
    grid[skipDoor.y][skipDoor.x] = '#';
    // Need to rebuild doorAt
    doorAt.delete(`${skipDoor.x},${skipDoor.y}`);

    const result = runSim();

    // Restore
    grid[skipDoor.y][skipDoor.x] = savedChar;
    doorAt.set(`${skipDoor.x},${skipDoor.y}`, skipDoor);

    if (result.success) {
      console.log(`[探索] 跳过 Y门(${skipDoor.x},${skipDoor.y}) → 通关成功!`);
      return { ...result, allEntities, allDoors, skippedDoor: skipDoor };
    } else {
      console.log(`[探索] 跳过 Y门(${skipDoor.x},${skipDoor.y}) → 仍然失败`);
    }
  }

  // All single-skip attempts failed, try skipping 2
  console.log(`\n[探索] 单门跳过全部失败，尝试跳过2扇黄门...`);
  for (let i = 0; i < yDoors.length; i++) {
    for (let j = i + 1; j < yDoors.length; j++) {
      const skip1 = yDoors[i], skip2 = yDoors[j];
      grid[skip1.y][skip1.x] = '#';
      grid[skip2.y][skip2.x] = '#';
      doorAt.delete(`${skip1.x},${skip1.y}`);
      doorAt.delete(`${skip2.x},${skip2.y}`);

      const result = runSim();

      grid[skip1.y][skip1.x] = skip1.char;
      grid[skip2.y][skip2.x] = skip2.char;
      doorAt.set(`${skip1.x},${skip1.y}`, skip1);
      doorAt.set(`${skip2.x},${skip2.y}`, skip2);

      if (result.success) {
        console.log(`[探索] 跳过 Y门(${skip1.x},${skip1.y})+(${skip2.x},${skip2.y}) → 通关成功!`);
        return { ...result, allEntities, allDoors, skippedDoors: [skip1, skip2] };
      }
    }
  }

  // Return greedy result as fallback
  return { ...greedyResult, allEntities, allDoors };
}

function printReport(grid, result) {
  const { success, eventLog, player, keys, consumed, allEntities, allDoors, skippedDoor, skippedDoors } = result;

  console.log('\n=== L1 地图（解析后 13×13）===');
  for (let r = 0; r < grid.length; r++) {
    console.log(`  ${r.toString().padStart(2)}: ${grid[r].join('')}`);
  }
  console.log();

  if (skippedDoor) console.log(`策略: 跳过 Y门(${skippedDoor.x},${skippedDoor.y})\n`);
  if (skippedDoors) console.log(`策略: 跳过 Y门${skippedDoors.map(d => `(${d.x},${d.y})`).join('+')} \n`);

  console.log('=== L1 最优通关路径 ===');
  let totalKills = 0, totalExp = 0, totalGold = 0, totalLvlUps = 0;

  for (const ev of eventLog) {
    const n = ev.step;
    if (ev.type === 'fight') {
      const m = MONSTERS[ev.char];
      const r = ev.result;
      totalKills++;
      totalExp += m.exp;
      totalGold += m.gold;
      totalLvlUps += r.lvlUps.length;
      console.log(`${n}. ${ev.coords}: 撞 ${ev.char} ${m.name}`);
      console.log(`   战斗: HP${r.hpBefore}→${ev.player.hp}, 玩伤${r.playerHit} 怪伤${r.monsterHit} ${r.turns}回合 承伤${r.damage} 经+${m.exp} 金+${m.gold}`);
      console.log(`   当前: HP${ev.player.hp} 攻${ev.player.atk} 防${ev.player.def} 金${ev.player.gold} 经${ev.player.exp} Lv${ev.player.level}`);
      if (r.lvlUps.length > 0) console.log(`   升级! → Lv${r.lvlUps.at(-1)} HP+100 攻+5 防+5`);
    } else if (ev.type === 'key') {
      console.log(`${n}. ${ev.coords}: 拿 ${ev.char} ${KEY_NAMES[ev.char]} (y=${ev.keys.y} b=${ev.keys.b} r=${ev.keys.r})`);
    } else if (ev.type === 'item') {
      console.log(`${n}. ${ev.coords}: 拿 ${ev.char} ${ITEMS[ev.char].name}`);
      console.log(`   HP${ev.before.hp}→${ev.after.hp} 攻${ev.before.atk}→${ev.after.atk} 防${ev.before.def}→${ev.after.def}`);
    } else if (ev.type === 'door') {
      console.log(`${n}. ${ev.coords}: 开 ${ev.char} ${DOOR_NAMES[ev.char]}${ev.doorPos} (消耗${DOORS[ev.char]}钥匙, y=${ev.keys.y} b=${ev.keys.b} r=${ev.keys.r})`);
    } else if (ev.type === 'exit') {
      console.log(`${n}. ${ev.coords}: 到达 U 上楼梯 ✅`);
    } else if (ev.type === 'stuck') {
      console.log(`${n}. ❌ 卡住: ${ev.reason}`);
    }
  }

  console.log();
  console.log('=== 统计 ===');
  console.log(`总击杀: ${totalKills} 怪`);
  console.log(`总经验: ${totalExp}`);
  console.log(`总金币: ${totalGold}`);
  console.log(`升级次数: ${totalLvlUps}`);
  console.log(`最终属性: HP${player.hp} 攻${player.atk} 防${player.def} 金${player.gold} 经${player.exp} Lv${player.level}`);
  console.log(`钥匙剩余: y=${keys.y} b=${keys.b} r=${keys.r}`);

  const notConsumed = allEntities.filter(e => !consumed.has(e.id));
  if (notConsumed.length > 0) {
    console.log();
    console.log('=== 未拾取/未击杀（非必经或无法到达）===');
    for (const i of notConsumed) {
      console.log(`  (${i.x},${i.y}) ${i.char} ${CHAR_NAMES[i.char] || i.char}`);
    }
  }

  console.log();
  console.log('=== v3 设计对比 & 建议 ===');
  // Count doors/keys on map
  let yDoors = 0, bDoors = 0, rDoors = 0, yKeys = 0, bKeys = 0, rKeys = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const ch = grid[r][c];
      if (ch === 'Y') yDoors++; if (ch === 'B') bDoors++; if (ch === 'R') rDoors++;
      if (ch === 'y') yKeys++; if (ch === 'b') bKeys++; if (ch === 'r') rKeys++;
    }
  }
  console.log(`地图钥匙/门: 黄钥${yKeys}/黄门${yDoors}, 蓝钥${bKeys}/蓝门${bDoors}, 红钥${rKeys}/红门${rDoors}`);

  if (!success) {
    console.log(`❌ 未能通关!`);
    console.log('建议:');
    if (yKeys < yDoors) console.log(`  - 黄钥匙不够! ${yKeys}把 < ${yDoors}扇门`);
    console.log('  - 可能需要增加钥匙或减少门');
  } else {
    console.log(`出 L1 属性: HP${player.hp} 攻${player.atk} 防${player.def}`);
    console.log(`v3 参考: 出L1约 HP~148 攻10 防10 (4僵尸+1红药,无宝石)`);
    console.log();

    if (player.hp > 200) console.log('建议: 出L1血量偏高(>200)，药水/宝石可能过多');
    if (player.hp < 50) console.log('建议: 出L1血量偏低(<50)，怪物过强或药水不够');
    if (totalLvlUps === 0 && totalExp < 50) console.log('建议: 升级未触发且经验偏低，考虑增加怪物');
    if (totalLvlUps === 0 && totalExp >= 80) console.log('建议: 经验接近100但未升级，再加1弱怪即可触发');
    if (totalLvlUps >= 2) console.log(`注意: L1升级${totalLvlUps}次，后续关卡可能太简单`);

    // Per-monster analysis
    for (const [ch, m] of Object.entries(MONSTERS)) {
      if (ch === 'X') continue;
      const fought = eventLog.filter(e => e.type === 'fight' && e.char === ch);
      if (fought.length > 0) {
        const avgDmg = fought.reduce((s, e) => s + e.result.damage, 0) / fought.length;
        if (avgDmg === 0) console.log(`建议: ${m.name}(${ch}) 对初始玩家0伤害，太弱，考虑 atk>${player.def > 10 ? 10 : player.def}+${player.def}`);
      }
    }

    // This map has tons of gems — player exits with huge stats for L1
    const totalGems = allEntities.filter(e => e.char === 'a' || e.char === 'd').length;
    if (totalGems > 2) console.log(`注意: L1有${totalGems}个宝石，属性膨胀严重 (攻${player.atk} 防${player.def})，L2怪物需要大幅加强`);
  }
}

const mapPath = resolve(__dirname, '..', 'docs', 'level', 'L1.txt');
const grid = parseMap(mapPath);
const result = solve(grid);
printReport(grid, result);
