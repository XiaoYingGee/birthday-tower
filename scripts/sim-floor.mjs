#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseArgs } from 'util';

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
  T: { name: '★神秘宝物',    apply: p => { p.hp *= 2; p.atk *= 2; p.def *= 2; } },
};

const DOORS = { Y: 'y', B: 'b', R: 'r' };
const DOOR_NAMES = { Y: '黄门', B: '蓝门', R: '红门' };
const KEY_NAMES = { y: '黄钥匙', b: '蓝钥匙', r: '红钥匙' };
const CHAR_NAMES = {
  ...Object.fromEntries(Object.entries(MONSTERS).map(([k, v]) => [k, v.name])),
  ...Object.fromEntries(Object.entries(ITEMS).map(([k, v]) => [k, v.name])),
  ...Object.fromEntries(Object.entries(DOOR_NAMES).map(([k, v]) => [k, v])),
  ...Object.fromEntries(Object.entries(KEY_NAMES).map(([k, v]) => [k, v])),
  '@': '玩家起点', D: '下楼梯(入口)', U: '上楼梯(出口)', '!': '未知物件(!)',
};

function parseMap(filePath) {
  const raw = readFileSync(filePath, 'utf-8').trimEnd().split('\n');
  // Detect format: if odd-indexed chars are all spaces, it's spaced format
  const spaced = raw[0].length > 15 && raw[0][1] === ' ';
  return raw.map(line => {
    if (spaced) {
      const row = [];
      for (let i = 0; i < line.length; i += 2) row.push(line[i]);
      return row;
    }
    return [...line];
  });
}

function calcFight(player, ch) {
  const m = MONSTERS[ch];
  if (!m) return null;
  const playerHit = Math.max(1, player.atk - m.def);
  const monsterHit = Math.max(0, m.atk - player.def);
  const turns = Math.ceil(m.hp / playerHit);
  const damage = (turns - 1) * monsterHit;
  return { playerHit, monsterHit, turns, damage, canWin: monsterHit === 0 ? true : player.hp > damage };
}

function doFight(player, ch) {
  const m = MONSTERS[ch];
  const f = calcFight(player, ch);
  if (!f || !f.canWin) return null;
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

function solve(grid, initPlayer, initKeys) {
  const H = grid.length, W = grid[0].length;
  let start, exit;
  const allEntities = [];
  const allDoors = [];
  const unknowns = [];

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const ch = grid[r][c];
      if (ch === '@' || ch === 'D') start = { x: c, y: r };
      if (ch === 'U') exit = { x: c, y: r };
      if (ch === '!') unknowns.push({ x: c, y: r });
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

  function runSim() {
    const consumed = new Set();
    const opened = new Set();
    const keys = { ...initKeys };
    const player = { ...initPlayer };
    let pos = { ...start };
    const eventLog = [];
    let stepN = 0;

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

    for (let iter = 0; iter < 500; iter++) {
      const { vis, par, adjDoors } = flood(pos);

      const reachable = [];
      for (const k of vis) {
        const e = entityAt.get(k);
        if (e && !consumed.has(e.id)) reachable.push(e);
      }

      reachable.sort((a, b) => {
        const pa = KEY_NAMES[a.char] ? 0 : ITEMS[a.char] ? 1 : 2;
        const pb = KEY_NAMES[b.char] ? 0 : ITEMS[b.char] ? 1 : 2;
        if (pa !== pb) return pa - pb;
        if (pa === 1) {
          // Items: potions before gems, T last (most valuable)
          const order = { h: 0, H: 1, a: 2, d: 3, T: 4 };
          return (order[a.char] ?? 9) - (order[b.char] ?? 9);
        }
        if (pa === 2) {
          const da = calcFight(player, a.char)?.damage ?? Infinity;
          const db = calcFight(player, b.char)?.damage ?? Infinity;
          return da - db;
        }
        return 0;
      });

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

      if (vis.has(`${exit.x},${exit.y}`)) {
        stepN++;
        eventLog.push({ step: stepN, type: 'exit', coords: sp(pathTo(par, exit)) });
        return { success: true, eventLog, player: { ...player }, keys: { ...keys }, consumed: new Set(consumed) };
      }

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

      eventLog.push({ step: ++stepN, type: 'stuck', reason: '无法到达出口，缺少钥匙或被门/墙阻挡' });
      return { success: false, eventLog, player: { ...player }, keys: { ...keys }, consumed: new Set(consumed) };
    }
    return { success: false, eventLog, player: { ...player }, keys: { ...keys }, consumed: new Set(consumed) };
  }

  // Brute-force: try all subsets of doors to skip
  // For each door type, compute surplus (keys available - doors). Negative = must skip some.
  const doorsByType = {};
  for (const d of allDoors) {
    const t = d.char;
    if (!doorsByType[t]) doorsByType[t] = [];
    doorsByType[t].push(d);
  }
  const keyCount = {};
  for (const e of allEntities) if (KEY_NAMES[e.char]) keyCount[e.char] = (keyCount[e.char] || 0) + 1;

  // Generate all combinations of doors to skip
  function combos(arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const res = [];
    for (let i = 0; i <= arr.length - k; i++) {
      for (const rest of combos(arr.slice(i + 1), k - 1)) {
        res.push([arr[i], ...rest]);
      }
    }
    return res;
  }

  // For each door type, how many must we skip? At least max(0, doors - totalKeys)
  const skipCounts = {};
  for (const [type, doors] of Object.entries(doorsByType)) {
    const kt = DOORS[type];
    const available = (keyCount[kt] || 0) + initKeys[kt];
    const mustSkip = Math.max(0, doors.length - available);
    skipCounts[type] = { min: mustSkip, max: doors.length - 1, doors };
  }

  // Generate skip combos per type, then cross-product
  const perType = {};
  for (const [type, info] of Object.entries(skipCounts)) {
    perType[type] = [];
    for (let n = info.min; n <= info.max; n++) {
      for (const c of combos(info.doors, n)) perType[type].push(c);
    }
  }

  const types = Object.keys(perType);
  function crossProduct(idx) {
    if (idx >= types.length) return [[]];
    const rest = crossProduct(idx + 1);
    const res = [];
    for (const mine of perType[types[idx]]) {
      for (const r of rest) res.push([...mine, ...r]);
    }
    return res;
  }

  const allSkipCombos = crossProduct(0);
  console.log(`\n[探索] 尝试 ${allSkipCombos.length} 种门跳过组合...`);

  let bestResult = null;
  let bestSkipped = null;

  for (const skipSet of allSkipCombos) {
    // Block skipped doors
    for (const d of skipSet) {
      grid[d.y][d.x] = '#';
      doorAt.delete(`${d.x},${d.y}`);
    }
    const result = runSim();
    // Restore
    for (const d of skipSet) {
      grid[d.y][d.x] = d.char;
      doorAt.set(`${d.x},${d.y}`, d);
    }
    if (result.success) {
      if (!bestResult || result.player.hp > bestResult.player.hp) {
        bestResult = result;
        bestSkipped = skipSet;
      }
    }
  }

  if (bestResult) {
    const label = bestSkipped.length > 0
      ? bestSkipped.map(d => `${d.char}门(${d.x},${d.y})`).join(' + ')
      : '无';
    console.log(`[探索] 最优方案: 跳过 ${label}`);
    return { ...bestResult, allEntities, allDoors, unknowns, skippedDoors: bestSkipped.length > 0 ? bestSkipped : undefined };
  }

  console.log(`[探索] 所有组合均失败`);
  const greedyResult = runSim();
  return { ...greedyResult, allEntities, allDoors, unknowns };
}

function printReport(grid, result, floorName, initPlayer, initKeys) {
  const { success, eventLog, player, keys, consumed, allEntities, allDoors, unknowns, skippedDoor, skippedDoors } = result;

  console.log(`\n=== ${floorName} 地图（解析后 ${grid.length}×${grid[0].length}）===`);
  for (let r = 0; r < grid.length; r++) {
    console.log(`  ${r.toString().padStart(2)}: ${grid[r].join('')}`);
  }
  console.log();

  // Object inventory
  console.log(`=== ${floorName} 物件清单 ===`);
  const inv = {};
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const ch = grid[r][c];
      if (ch !== '#' && ch !== '.' && ch !== ' ') {
        if (!inv[ch]) inv[ch] = [];
        inv[ch].push(`(${c},${r})`);
      }
    }
  }
  for (const [ch, locs] of Object.entries(inv)) {
    console.log(`  ${ch} ${CHAR_NAMES[ch] || ch}: ${locs.join(' ')}`);
  }
  console.log();

  // Start/exit info
  let startCh = null, startPos = null, exitPos = null;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === '@' || grid[r][c] === 'D') { startCh = grid[r][c]; startPos = `(${c},${r})`; }
      if (grid[r][c] === 'U') exitPos = `(${c},${r})`;
    }
  }
  console.log(`起点: ${startCh} ${startPos} | 出口: U ${exitPos}`);
  console.log(`入层属性: HP${initPlayer.hp} 攻${initPlayer.atk} 防${initPlayer.def} 金${initPlayer.gold} 经${initPlayer.exp} Lv${initPlayer.level}`);
  console.log(`入层钥匙: y=${initKeys.y} b=${initKeys.b} r=${initKeys.r}`);
  console.log();

  // Key/door analysis
  let yDoors = 0, bDoors = 0, rDoors = 0, yKeys = 0, bKeys = 0, rKeys = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const ch = grid[r][c];
      if (ch === 'Y') yDoors++; if (ch === 'B') bDoors++; if (ch === 'R') rDoors++;
      if (ch === 'y') yKeys++; if (ch === 'b') bKeys++; if (ch === 'r') rKeys++;
    }
  }
  console.log(`=== 钥匙 vs 门 分析 ===`);
  console.log(`地图钥匙: 黄${yKeys} 蓝${bKeys} 红${rKeys}`);
  console.log(`地图门:   黄${yDoors} 蓝${bDoors} 红${rDoors}`);
  console.log(`带入钥匙: 黄${initKeys.y} 蓝${initKeys.b} 红${initKeys.r}`);
  console.log(`总可用:   黄${yKeys + initKeys.y} 蓝${bKeys + initKeys.b} 红${rKeys + initKeys.r}`);
  const yBalance = yKeys + initKeys.y - yDoors;
  const bBalance = bKeys + initKeys.b - bDoors;
  const rBalance = rKeys + initKeys.r - rDoors;
  console.log(`差额:     黄${yBalance >= 0 ? '+' : ''}${yBalance} 蓝${bBalance >= 0 ? '+' : ''}${bBalance} 红${rBalance >= 0 ? '+' : ''}${rBalance}`);
  if (yBalance < 0) console.log(`⚠️  黄钥匙不足! 必须跳过 ${-yBalance} 扇黄门`);
  if (bBalance < 0) console.log(`⚠️  蓝钥匙不足! 必须跳过 ${-bBalance} 扇蓝门`);
  if (rBalance < 0) console.log(`⚠️  红钥匙不足! 必须跳过 ${-rBalance} 扇红门`);
  console.log();

  if (skippedDoor) console.log(`策略: 跳过 ${skippedDoor.char}门(${skippedDoor.x},${skippedDoor.y})\n`);
  if (skippedDoors) console.log(`策略: 跳过 ${skippedDoors.map(d => `${d.char}门(${d.x},${d.y})`).join(' + ')}\n`);

  console.log(`=== ${floorName} 最优通关路径 ===`);
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
  console.log();

  console.log(`=== 出层属性 ===`);
  console.log(`HP${player.hp} 攻${player.atk} 防${player.def} 金${player.gold} 经${player.exp} Lv${player.level}`);
  console.log(`钥匙剩余: y=${keys.y} b=${keys.b} r=${keys.r}`);

  const notConsumed = allEntities.filter(e => !consumed.has(e.id));
  if (notConsumed.length > 0) {
    console.log();
    console.log('=== 未拾取/未击杀 ===');
    for (const i of notConsumed) {
      console.log(`  (${i.x},${i.y}) ${i.char} ${CHAR_NAMES[i.char] || i.char}`);
    }
  }

  console.log();
  console.log('=== 关键问题分析 ===');

  // a) T treasure
  const treasures = allEntities.filter(e => e.char === 'T');
  if (treasures.length > 0) {
    console.log(`\na) ★ 宝物 (T):`);
    for (const t of treasures) {
      const got = consumed.has(t.id);
      console.log(`   位置 (${t.x},${t.y}), 玩家${got ? '已获取 ✅' : '未获取 ❌'}`);
      if (got) {
        const tEvent = eventLog.find(e => e.type === 'item' && e.char === 'T');
        if (tEvent) console.log(`   效果: HP${tEvent.before.hp}→${tEvent.after.hp} 攻${tEvent.before.atk}→${tEvent.after.atk} 防${tEvent.before.def}→${tEvent.after.def} (×2翻倍)`);
      }
    }
  }

  // b) Monster damage analysis
  console.log(`\nb) 怪物伤害分析 (入层攻${initPlayer.atk} 防${initPlayer.def}):`);
  for (const [ch, m] of Object.entries(MONSTERS)) {
    if (ch === 'X') continue;
    const count = allEntities.filter(e => e.char === ch).length;
    if (count === 0) continue;
    const f = calcFight(initPlayer, ch);
    const fightable = f.canWin ? '可打' : '❌打不过';
    const dmgLabel = f.monsterHit === 0 ? '0伤(太弱!)' : `承伤${f.damage}`;
    console.log(`   ${ch} ${m.name} ×${count}: ${fightable}, ${f.turns}回合, ${dmgLabel}`);
    if (f.monsterHit === 0) console.log(`      ⚠️ 怪攻${m.atk} ≤ 玩防${initPlayer.def}，0伤害，考虑加强`);
  }

  // c) ! unknown objects
  if (unknowns.length > 0) {
    console.log(`\nc) 未知物件 (!):`);
    for (const u of unknowns) {
      console.log(`   位置 (${u.x},${u.y}) — 需确认：是 BOSS(X龙王)? 特殊道具? NPC?`);
    }
  }

  if (!success) {
    console.log(`\n❌ 未能通关!`);
    console.log('可能原因: 钥匙不足 / 怪物过强 / 路径被封死');
  }
}

// CLI
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    hp:   { type: 'string', default: '100' },
    atk:  { type: 'string', default: '10' },
    def:  { type: 'string', default: '10' },
    gold: { type: 'string', default: '0' },
    exp:  { type: 'string', default: '0' },
    lv:   { type: 'string', default: '1' },
    y:    { type: 'string', default: '0' },
    b:    { type: 'string', default: '0' },
    r:    { type: 'string', default: '0' },
  },
  allowPositionals: true,
});

const mapPath = resolve(positionals[0]);
const floorName = mapPath.match(/([^/]+)\.txt$/)?.[1] || 'Floor';

const initPlayer = {
  hp: +values.hp, atk: +values.atk, def: +values.def,
  gold: +values.gold, exp: +values.exp, level: +values.lv,
};
const initKeys = { y: +values.y, b: +values.b, r: +values.r };

console.log(`=== sim-floor: ${floorName} ===`);
console.log(`地图: ${mapPath}`);

const grid = parseMap(mapPath);
const result = solve(grid, initPlayer, initKeys);
printReport(grid, result, floorName, initPlayer, initKeys);
