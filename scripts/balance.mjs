#!/usr/bin/env node
/**
 * 关卡数值演算器
 * 核心设计：★在L2黄门后。A路径保留黄钥匙，用于L4黄门(含蓝药+攻宝石)。
 * B路径用黄钥匙开L2门拿★，但L4黄门资源拿不到。
 */

// 怪物表
const MONSTERS = {
  zombie:   { name: '僵尸',     hp: 15,  atk: 8,  def: 1,  gold: 6,  exp: 12 },
  skeleton: { name: '骷髅',     hp: 30,  atk: 15, def: 5,  gold: 10, exp: 18 },
  bat:      { name: '蝙蝠',     hp: 25,  atk: 16, def: 3,  gold: 10, exp: 15 },
  wizard:   { name: '棕巫师',   hp: 45,  atk: 22, def: 8,  gold: 15, exp: 25 },
  knight:   { name: '暗黑骑士', hp: 70,  atk: 30, def: 12, gold: 20, exp: 40 },
  dragon:   { name: '龙王',     hp: 350, atk: 46, def: 18, gold: 0,  exp: 0  },
};

// 道具效果
const ITEMS = {
  redPotion:  { name: '红药', apply: p => { p.hp += 30; } },
  bluePotion: { name: '蓝药', apply: p => { p.hp += 70; } },
  atkGem:     { name: '攻击宝石', apply: p => { p.atk += 3; } },
  defGem:     { name: '防御宝石', apply: p => { p.def += 3; } },
  treasure:   { name: '神秘宝物★', apply: p => { p.hp += 60; p.atk += 4; p.def += 2; } },
};

// 商人（仅 L3）
const SHOP = {
  hp50:  { name: 'HP+50', cost: 20, apply: p => { p.hp += 50; } },
  atk3:  { name: '攻+3',  cost: 25, apply: p => { p.atk += 3; } },
  def3:  { name: '防+3',  cost: 25, apply: p => { p.def += 3; } },
};

function newPlayer() {
  return { hp: 120, atk: 12, def: 6, gold: 0, exp: 0, level: 1 };
}

function checkLevelUp(p, log) {
  while (p.exp >= 80) {
    p.exp -= 80;
    p.level += 1;
    p.hp += 30;
    p.atk += 4;
    p.def += 3;
    log.push(`  ⬆️ 升级到 Lv${p.level} → HP+30 攻+4 防+3`);
  }
}

function fight(p, monsterId, log) {
  const m = MONSTERS[monsterId];
  const playerHit = Math.max(1, p.atk - m.def);
  const monsterHit = Math.max(0, m.atk - p.def);
  const turns = Math.ceil(m.hp / playerHit);
  const damage = (turns - 1) * monsterHit;

  if (p.hp <= damage) {
    log.push(`❌ 打${m.name}会死: HP${p.hp} <= 承伤${damage} (玩伤${playerHit} 怪伤${monsterHit} ${turns}回合)`);
    return false;
  }

  p.hp -= damage;
  p.gold += m.gold;
  p.exp += m.exp;
  log.push(`  ⚔️ 击败${m.name}: -${damage}HP +${m.gold}金 +${m.exp}经 → HP${p.hp} 金${p.gold} 经${p.exp}`);
  checkLevelUp(p, log);
  return true;
}

function pickup(p, itemId, log) {
  ITEMS[itemId].apply(p);
  log.push(`  📦 拾取${ITEMS[itemId].name} → HP${p.hp} 攻${p.atk} 防${p.def}`);
}

function buy(p, shopId, log) {
  const s = SHOP[shopId];
  if (p.gold < s.cost) {
    log.push(`  💰 买不起${s.name} (需${s.cost}金 有${p.gold}金)`);
    return false;
  }
  p.gold -= s.cost;
  s.apply(p);
  log.push(`  🛒 买${s.name} -${s.cost}金 → HP${p.hp} 攻${p.atk} 防${p.def} 金${p.gold}`);
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
      if (!fight(p, ev.monster, log)) return { ok: false, log };
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
// 路径 A：不拿 ★（聪明孩子）
// - L1: 打4僵尸，拿红药+攻宝石+黄钥匙
// - L2: 走安全路线(不开黄门)，打2骷髅，拿红药+防宝石+蓝药
// - L3: 商人买攻+3防+3，打2蝙蝠，拿攻宝石+红药
// - L4: 打2巫师，拿蓝药+防宝石；【黄门后】拿蓝药+攻宝石 ← A独占资源！
// - L5: 打2骑士，拿蓝药+红药+防宝石
// - L6: BOSS
// ============================================================
const pathA = [
  { type: 'floor', name: 'L1 教学层' },
  { type: 'fight', monster: 'zombie' },
  { type: 'fight', monster: 'zombie' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'fight', monster: 'zombie' },
  { type: 'fight', monster: 'zombie' },
  { type: 'pickup', item: 'atkGem' },
  { type: 'note', text: '拿黄钥匙(保留给L4)，上L2' },

  { type: 'floor', name: 'L2 白骨回廊（安全路线）' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'pickup', item: 'defGem' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'pickup', item: 'bluePotion' },

  { type: 'floor', name: 'L3 商人之厅' },
  { type: 'buy', item: 'atk3' },
  { type: 'buy', item: 'def3' },
  { type: 'fight', monster: 'bat' },
  { type: 'pickup', item: 'atkGem' },
  { type: 'fight', monster: 'bat' },
  { type: 'pickup', item: 'redPotion' },

  { type: 'floor', name: 'L4 火花工坊（开黄门拿秘宝）' },
  { type: 'fight', monster: 'wizard' },
  { type: 'pickup', item: 'bluePotion' },
  { type: 'fight', monster: 'wizard' },
  { type: 'pickup', item: 'defGem' },
  { type: 'note', text: '开黄门（A独占）' },
  { type: 'pickup', item: 'bluePotion' },
  { type: 'pickup', item: 'atkGem' },

  { type: 'floor', name: 'L5 末影长廊' },
  { type: 'fight', monster: 'knight' },
  { type: 'pickup', item: 'bluePotion' },
  { type: 'fight', monster: 'knight' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'pickup', item: 'defGem' },

  { type: 'floor', name: 'L6 BOSS 决战' },
  { type: 'fight', monster: 'dragon' },
];

// ============================================================
// 路径 B：拿了 ★（贪心孩子）
// - L1: 同A
// - L2: 开黄门拿★（用掉黄钥匙），打2骷髅，拿红药（错过蓝药+防宝石）
// - L3: 同A
// - L4: 打2巫师，拿蓝药+防宝石；黄门打不开（没钥匙）→ 错过蓝药+攻宝石
// - L5: 同A
// - L6: BOSS
// ============================================================
const pathB = [
  { type: 'floor', name: 'L1 教学层' },
  { type: 'fight', monster: 'zombie' },
  { type: 'fight', monster: 'zombie' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'fight', monster: 'zombie' },
  { type: 'fight', monster: 'zombie' },
  { type: 'pickup', item: 'atkGem' },

  { type: 'floor', name: 'L2 白骨回廊（开黄门拿★）' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'note', text: '用黄钥匙开门' },
  { type: 'pickup', item: 'treasure' },
  // B 错过: L2蓝药(+70) + L2防宝石(+3防)
  // B 错过: L4黄门后的蓝药(+70) + 攻宝石(+3攻)

  { type: 'floor', name: 'L3 商人之厅' },
  { type: 'buy', item: 'atk3' },
  { type: 'buy', item: 'def3' },
  { type: 'fight', monster: 'bat' },
  { type: 'pickup', item: 'atkGem' },
  { type: 'fight', monster: 'bat' },
  { type: 'pickup', item: 'redPotion' },

  { type: 'floor', name: 'L4 火花工坊（没有黄钥匙，跳过黄门）' },
  { type: 'fight', monster: 'wizard' },
  { type: 'pickup', item: 'bluePotion' },
  { type: 'fight', monster: 'wizard' },
  { type: 'pickup', item: 'defGem' },
  { type: 'note', text: '黄门打不开！错过蓝药+攻宝石' },

  { type: 'floor', name: 'L5 末影长廊' },
  { type: 'fight', monster: 'knight' },
  { type: 'pickup', item: 'bluePotion' },
  { type: 'fight', monster: 'knight' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'pickup', item: 'defGem' },

  { type: 'floor', name: 'L6 BOSS 决战' },
  { type: 'fight', monster: 'dragon' },
];

// ============================================================
// 路径 C：极简路径（不拿★，不买防，少打怪）
// ============================================================
const pathC = [
  { type: 'floor', name: 'L1 教学层' },
  { type: 'fight', monster: 'zombie' },
  { type: 'fight', monster: 'zombie' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'fight', monster: 'zombie' },
  { type: 'fight', monster: 'zombie' },
  { type: 'pickup', item: 'atkGem' },

  { type: 'floor', name: 'L2 白骨回廊（安全路线）' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'pickup', item: 'defGem' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'pickup', item: 'bluePotion' },

  { type: 'floor', name: 'L3 商人之厅（只买攻）' },
  { type: 'buy', item: 'atk3' },
  { type: 'fight', monster: 'bat' },
  { type: 'pickup', item: 'atkGem' },
  // 跳过第2只蝙蝠

  { type: 'floor', name: 'L4 火花工坊（开黄门）' },
  { type: 'fight', monster: 'wizard' },
  { type: 'pickup', item: 'bluePotion' },
  { type: 'fight', monster: 'wizard' },
  { type: 'pickup', item: 'defGem' },
  { type: 'pickup', item: 'bluePotion' },
  { type: 'pickup', item: 'atkGem' },

  { type: 'floor', name: 'L5 末影长廊' },
  { type: 'fight', monster: 'knight' },
  { type: 'pickup', item: 'bluePotion' },
  { type: 'fight', monster: 'knight' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'pickup', item: 'defGem' },

  { type: 'floor', name: 'L6 BOSS 决战' },
  { type: 'fight', monster: 'dragon' },
];

// ============================================================
// 路径 D：拿★ + 跳过L3商人
// ============================================================
const pathD = [
  { type: 'floor', name: 'L1 教学层' },
  { type: 'fight', monster: 'zombie' },
  { type: 'fight', monster: 'zombie' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'fight', monster: 'zombie' },
  { type: 'fight', monster: 'zombie' },
  { type: 'pickup', item: 'atkGem' },

  { type: 'floor', name: 'L2 白骨回廊（拿★）' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'fight', monster: 'skeleton' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'pickup', item: 'treasure' },

  { type: 'floor', name: 'L3 商人之厅（不买）' },
  { type: 'fight', monster: 'bat' },
  { type: 'pickup', item: 'atkGem' },
  { type: 'fight', monster: 'bat' },
  { type: 'pickup', item: 'redPotion' },

  { type: 'floor', name: 'L4 火花工坊（没黄钥匙）' },
  { type: 'fight', monster: 'wizard' },
  { type: 'pickup', item: 'bluePotion' },
  { type: 'fight', monster: 'wizard' },
  { type: 'pickup', item: 'defGem' },

  { type: 'floor', name: 'L5 末影长廊' },
  { type: 'fight', monster: 'knight' },
  { type: 'pickup', item: 'bluePotion' },
  { type: 'fight', monster: 'knight' },
  { type: 'pickup', item: 'redPotion' },
  { type: 'pickup', item: 'defGem' },

  { type: 'floor', name: 'L6 BOSS 决战' },
  { type: 'fight', monster: 'dragon' },
];

// ============================================================
// 执行
// ============================================================
const paths = [
  { name: 'A · 不拿★（聪明）', events: pathA, wantPass: true },
  { name: 'B · 拿了★（贪心）', events: pathB, wantPass: false },
  { name: 'C · 极简（不拿★少买）', events: pathC, wantPass: null },
  { name: 'D · 拿★跳过商人', events: pathD, wantPass: false },
];

let allGood = true;
for (const { name, events, wantPass } of paths) {
  const result = runPath(name, events);
  console.log(result.log.join('\n'));
  const label = result.ok ? '✅ 通关' : '❌ 死亡';
  const check = wantPass === null ? '(参考)' :
    (result.ok === wantPass ? '👍 符合预期' : '⚠️ 不符预期!');
  console.log(`\n>>> 路径 ${name} 结果: ${label} ${check}`);
  if (wantPass !== null && result.ok !== wantPass) allGood = false;
}

console.log('\n============================');
console.log('设计目标：A通关 ✅ + B必死 ❌');
console.log(`是否全部达标: ${allGood ? '✅✅✅ 数值平衡成功！' : '❌ 需要调整数值'}`);
