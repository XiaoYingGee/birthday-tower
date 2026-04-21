#!/usr/bin/env node
/**
 * v3 关卡数值演算器（按 XYG 强制规则）
 * 
 * 强制规则：
 * 1. 初始 HP100 攻10 防10
 * 2. 升级：经验满 100 → HP+100 攻+5 防+5
 * 3. ★ HP/攻/防 全部 ×2
 * 4. 红宝石 +10 攻 / 蓝宝石 +10 防
 * 5. 黄钥匙不唯一
 * 6. 门数 > 钥匙数（取舍）
 * 7. **不拿★ 必败 BOSS**
 * 8. **拿★必须在 BOSS 前最后一刻** 才能通关
 */

const MONSTERS = {
  zombie:   { name: '僵尸',     hp: 25,  atk: 12, def: 2,  gold: 5,  exp: 12 },
  skeleton: { name: '骷髅',     hp: 50,  atk: 18, def: 5,  gold: 10, exp: 20 },
  bat:      { name: '蝙蝠',     hp: 70,  atk: 22, def: 8,  gold: 15, exp: 25 },
  wizard:   { name: '棕巫师',   hp: 100, atk: 28, def: 12, gold: 20, exp: 35 },
  knight:   { name: '暗黑骑士', hp: 150, atk: 36, def: 16, gold: 30, exp: 50 },
  dragon:   { name: '龙王',     hp: 1500, atk: 120, def: 55, gold: 0,  exp: 0  },
};

const ITEMS = {
  redPotion:   { name: '红药+50HP',  apply: p => { p.hp += 50; } },
  bluePotion:  { name: '蓝药+150HP', apply: p => { p.hp += 150; } },
  redGem:      { name: '红宝石+10攻', apply: p => { p.atk += 10; } },
  blueGem:     { name: '蓝宝石+10防', apply: p => { p.def += 10; } },
  treasure:    { name: '★神秘宝物×2', apply: p => { p.hp *= 2; p.atk *= 2; p.def *= 2; } },
};

const SHOP = {
  hp100:  { name: 'HP+100', cost: 30, apply: p => { p.hp += 100; } },
  atk5:   { name: '攻+5',   cost: 50, apply: p => { p.atk += 5; } },
  def5:   { name: '防+5',   cost: 50, apply: p => { p.def += 5; } },
};

function newPlayer() {
  return { hp: 100, atk: 10, def: 10, gold: 0, exp: 0, level: 1 };
}

function checkLevelUp(p, log) {
  while (p.exp >= 100) {
    p.exp -= 100;
    p.level += 1;
    p.hp += 100;
    p.atk += 5;
    p.def += 5;
    log.push(`  ⬆️ Lv${p.level} (HP+100 攻+5 防+5) → HP${p.hp} 攻${p.atk} 防${p.def}`);
  }
}

function fight(p, monsterId, log) {
  const m = MONSTERS[monsterId];
  const playerHit = Math.max(1, p.atk - m.def);
  const monsterHit = Math.max(0, m.atk - p.def);
  const turns = Math.ceil(m.hp / playerHit);
  const damage = (turns - 1) * monsterHit;
  
  if (p.hp <= damage) {
    log.push(`  ❌ 打${m.name}: HP${p.hp}<=承伤${damage} (玩伤${playerHit} 怪伤${monsterHit} ${turns}回合)`);
    return false;
  }
  
  p.hp -= damage;
  p.gold += m.gold;
  p.exp += m.exp;
  log.push(`  ⚔️ ${m.name}(HP${m.hp} 攻${m.atk} 防${m.def}): -${damage}HP +${m.gold}金 +${m.exp}经 → HP${p.hp} 金${p.gold} 经${p.exp}`);
  checkLevelUp(p, log);
  return true;
}

function pickup(p, itemId, log) {
  const before = `HP${p.hp} 攻${p.atk} 防${p.def}`;
  ITEMS[itemId].apply(p);
  log.push(`  📦 ${ITEMS[itemId].name}: ${before} → HP${p.hp} 攻${p.atk} 防${p.def}`);
}

function buy(p, shopId, log) {
  const s = SHOP[shopId];
  if (p.gold < s.cost) {
    log.push(`  💰 买不起${s.name} (需${s.cost}金 有${p.gold}金)`);
    return false;
  }
  p.gold -= s.cost;
  s.apply(p);
  log.push(`  🛒 ${s.name}: -${s.cost}金 → HP${p.hp} 攻${p.atk} 防${p.def} 金${p.gold}`);
  return true;
}

function runPath(name, events) {
  const p = newPlayer();
  const log = [];
  log.push(`\n=== 路径: ${name} ===`);
  log.push(`初始: HP${p.hp} 攻${p.atk} 防${p.def}`);
  
  for (const ev of events) {
    if (ev.type === 'floor') {
      log.push(`\n--- ${ev.name} ---`);
    } else if (ev.type === 'fight') {
      if (!fight(p, ev.monster, log)) return { ok: false, log, player: p };
    } else if (ev.type === 'pickup') {
      pickup(p, ev.item, log);
    } else if (ev.type === 'buy') {
      buy(p, ev.item, log);
    } else if (ev.type === 'note') {
      log.push(`  📝 ${ev.text}`);
    }
  }
  
  log.push(`\n最终: HP${p.hp} 攻${p.atk} 防${p.def} 金${p.gold} 经${p.exp} Lv${p.level}`);
  return { ok: true, log, player: p };
}

// ============================================================
// 全部资源点（不含★）
// ============================================================
// L1: 4 僵尸 + 1 红药
const L1 = [
  { type: 'floor', name: 'L1' },
  { type: 'fight', monster: 'zombie' },
  { type: 'fight', monster: 'zombie' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'fight', monster: 'zombie' },
  { type: 'fight', monster: 'zombie' },
];

// L2: 3 骷髅 + 1 红药 + 1 蓝宝石
const L2_no_treasure = [
  { type: 'floor', name: 'L2 (不拿★)' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'pickup', item: 'blueGem' },
  { type: 'fight', monster: 'skeleton' },
];

const L2_with_treasure = [
  { type: 'floor', name: 'L2 (拿★)' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'pickup', item: 'blueGem' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'pickup', item: 'treasure' },
];

// L3: 商人 + 3 蝙蝠 + 1 蓝药
const L3 = [
  { type: 'floor', name: 'L3 商人' },
  { type: 'fight', monster: 'bat' },
  { type: 'buy', item: 'atk5' },
  { type: 'buy', item: 'def5' },
  { type: 'buy', item: 'hp100' },
  { type: 'fight', monster: 'bat' },
  { type: 'pickup', item: 'bluePotion' },
  { type: 'fight', monster: 'bat' },
];

// L4: 3 巫师 + 红宝石 + 蓝药
const L4 = [
  { type: 'floor', name: 'L4' },
  { type: 'fight', monster: 'wizard' },
  { type: 'pickup', item: 'redGem' },
  { type: 'fight', monster: 'wizard' },
  { type: 'pickup', item: 'bluePotion' },
  { type: 'fight', monster: 'wizard' },
];

// L5: 2 暗黑骑士 + 蓝宝石 + 红宝石
const L5 = [
  { type: 'floor', name: 'L5' },
  { type: 'fight', monster: 'knight' },
  { type: 'pickup', item: 'blueGem' },
  { type: 'fight', monster: 'knight' },
  { type: 'pickup', item: 'redGem' },
];

const BOSS = [
  { type: 'floor', name: 'L6 BOSS' },
  { type: 'fight', monster: 'dragon' },
];

// ============================================================
// 路径 A：从不拿★（聪明孩子尝试，但应该打不过 BOSS）
// ============================================================
const pathA = [...L1, ...L2_no_treasure, ...L3, ...L4, ...L5, ...BOSS];

// ============================================================
// 路径 B：BOSS前最后一刻拿★（唯一通关解）
// ============================================================
const pathB = [
  ...L1, ...L2_no_treasure, ...L3, ...L4, ...L5,
  { type: 'note', text: '★ 在 L2，但 L5 拿到通行证（特殊门钥匙），最后回 L2 拿' },
  { type: 'pickup', item: 'treasure' },  // 模拟回 L2 拿
  ...BOSS,
];

// ============================================================
// 路径 C：L2 直接拿★（贪心孩子，BOSS必败）
// ============================================================
const pathC = [...L1, ...L2_with_treasure, ...L3, ...L4, ...L5, ...BOSS];

// ============================================================
// 执行 + 总结
// ============================================================
function summary(name, result, expected) {
  const ok = result.ok ? '✅通关' : '❌死亡';
  const expect = expected === 'win' ? '✅通关' : '❌死亡';
  const match = (result.ok && expected==='win') || (!result.ok && expected==='die');
  return `${match?'✅':'❌'} ${name}: ${ok} (期望${expect})${result.ok ? ` 剩HP${result.player.hp}` : ''}`;
}

const rA = runPath('A · 永不拿★', pathA);
const rB = runPath('B · BOSS前最后拿★', pathB);
const rC = runPath('C · L2直接拿★', pathC);

console.log(rA.log.join('\n'));
console.log(rB.log.join('\n'));
console.log(rC.log.join('\n'));

console.log('\n============================================================');
console.log('设计要求：A 必败 ❌ + B 通关 ✅ + C 必败 ❌');
console.log('============================================================');
console.log(summary('A 永不拿★      ', rA, 'die'));
console.log(summary('B BOSS前最后拿  ', rB, 'win'));
console.log(summary('C L2 直接拿★    ', rC, 'die'));

const allMatch = !rA.ok && rB.ok && !rC.ok;
console.log(`\n总评：${allMatch ? '✅✅✅ 设计成功！' : '❌ 还需调整数值'}`);
