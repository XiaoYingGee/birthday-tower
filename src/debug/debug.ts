import { CONFIG } from '../data/config';
import { FLOOR_PRESETS } from './debug-presets';
import type { GameEngine } from '../core/engine';

function makeSection(title: string, collapsed = false): { wrapper: HTMLElement; content: HTMLElement } {
  const wrapper = document.createElement('div');
  wrapper.className = 'debug-section';
  const header = document.createElement('div');
  header.className = 'debug-section-header';
  const arrow = document.createElement('span');
  arrow.className = 'debug-arrow';
  arrow.textContent = collapsed ? '▶' : '▼';
  const label = document.createElement('span');
  label.textContent = title;
  header.append(arrow, label);
  const content = document.createElement('div');
  content.className = 'debug-section-content';
  if (collapsed) content.style.display = 'none';
  header.addEventListener('click', () => {
    const hidden = content.style.display === 'none';
    content.style.display = hidden ? '' : 'none';
    arrow.textContent = hidden ? '▼' : '▶';
  });
  wrapper.append(header, content);
  return { wrapper, content };
}

function makeRow(label: string, initialVal: string | number, onMinus: () => void, onPlus: () => void): { row: HTMLElement; valEl: HTMLElement } {
  const row = document.createElement('div');
  row.className = 'debug-row';
  const lbl = document.createElement('span');
  lbl.className = 'debug-label';
  lbl.textContent = label;
  const minus = document.createElement('button');
  minus.className = 'debug-btn';
  minus.textContent = '−';
  const val = document.createElement('span');
  val.className = 'debug-val';
  val.textContent = String(initialVal);
  const plus = document.createElement('button');
  plus.className = 'debug-btn';
  plus.textContent = '+';
  minus.addEventListener('click', (e) => { e.stopPropagation(); onMinus(); });
  plus.addEventListener('click', (e) => { e.stopPropagation(); onPlus(); });
  row.append(lbl, minus, val, plus);
  return { row, valEl: val };
}

export function createDebugPanel(engine: GameEngine): void {
  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.innerHTML = `
    <div class="debug-header">
      <span>Debug</span>
      <button class="debug-toggle">−</button>
    </div>
    <div class="debug-body"></div>
  `;
  document.body.appendChild(panel);

  const toggle = panel.querySelector('.debug-toggle') as HTMLElement;
  const body = panel.querySelector('.debug-body') as HTMLElement;
  toggle.addEventListener('click', () => {
    body.classList.toggle('collapsed');
    toggle.textContent = body.classList.contains('collapsed') ? '+' : '−';
  });

  // --- Floors ---
  const floors = makeSection('楼层跳转');
  const floorsRow = document.createElement('div');
  floorsRow.className = 'debug-floors';

  let debugPreset = false;
  const presetBtn = document.createElement('button');
  presetBtn.textContent = 'debug';
  presetBtn.className = 'debug-btn debug-preset-off';
  presetBtn.addEventListener('click', () => {
    debugPreset = !debugPreset;
    presetBtn.className = debugPreset ? 'debug-btn debug-preset-on' : 'debug-btn debug-preset-off';
  });
  floorsRow.appendChild(presetBtn);

  const floorButtons: { label: string; index: number; startPos?: { x: number; y: number } }[] = [];
  for (let i = 0; i < 6; i++) {
    if (i === 3) {
      floorButtons.push({ label: 'F4L', index: 3, startPos: { x: 2, y: 1 } });
      floorButtons.push({ label: 'F4R', index: 3, startPos: { x: 10, y: 1 } });
    } else {
      floorButtons.push({ label: `F${i + 1}`, index: i });
    }
  }
  for (const fb of floorButtons) {
    const btn = document.createElement('button');
    btn.textContent = fb.label;
    btn.className = 'debug-btn';
    btn.addEventListener('click', () => {
      if (debugPreset) {
        engine.debugResetFloor(fb.index, FLOOR_PRESETS[fb.index], fb.startPos);
      } else {
        engine.debugGoToFloor(fb.index);
      }
    });
    floorsRow.appendChild(btn);
  }
  floors.content.appendChild(floorsRow);
  body.appendChild(floors.wrapper);

  // --- Player ---
  const player = makeSection('玩家属性');
  const playerFields = [
    { key: 'hp', label: 'HP' },
    { key: 'atk', label: '攻' },
    { key: 'def', label: '防' },
    { key: 'gold', label: '金' },
    { key: 'exp', label: '经验' },
    { key: 'yellowKeys', label: '黄钥匙' },
    { key: 'blueKeys', label: '蓝钥匙' },
    { key: 'redKeys', label: '红钥匙' },
  ];
  const inputKeys = new Set(['hp', 'atk', 'def', 'gold', 'exp']);
  const playerSyncEls: { key: string; el: HTMLElement; isInput: boolean }[] = [];
  for (const f of playerFields) {
    if (inputKeys.has(f.key)) {
      const row = document.createElement('div');
      row.className = 'debug-row';
      const lbl = document.createElement('span');
      lbl.className = 'debug-label';
      lbl.textContent = f.label;
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'debug-input';
      input.value = '0';
      input.addEventListener('focus', () => { input.value = ''; });
      input.addEventListener('change', () => {
        const val = parseInt(input.value, 10);
        if (!isNaN(val)) engine.debugSetPlayer(f.key, Math.max(0, val));
      });
      input.addEventListener('keydown', (e) => { e.stopPropagation(); });
      row.append(lbl, input);
      playerSyncEls.push({ key: f.key, el: input, isInput: true });
      player.content.appendChild(row);
    } else {
      const { row, valEl } = makeRow(f.label, 0,
        () => engine.debugAdjustPlayer(f.key, -1),
        () => engine.debugAdjustPlayer(f.key, 1),
      );
      playerSyncEls.push({ key: f.key, el: valEl, isInput: false });
      player.content.appendChild(row);
    }
  }
  body.appendChild(player.wrapper);

  // --- Level Up ---
  const lvUp = makeSection('升级属性', true);
  const lvFields: { key: keyof typeof CONFIG.levelUp; label: string }[] = [
    { key: 'expRequired', label: '所需经验' },
    { key: 'hpGain', label: 'HP增益' },
    { key: 'atkGain', label: '攻增益' },
    { key: 'defGain', label: '防增益' },
  ];
  for (const f of lvFields) {
    const { row, valEl } = makeRow(f.label, CONFIG.levelUp[f.key],
      () => { CONFIG.levelUp[f.key] = Math.max(1, CONFIG.levelUp[f.key] - 1); valEl.textContent = String(CONFIG.levelUp[f.key]); },
      () => { CONFIG.levelUp[f.key] += 1; valEl.textContent = String(CONFIG.levelUp[f.key]); },
    );
    lvUp.content.appendChild(row);
  }
  body.appendChild(lvUp.wrapper);

  // --- Items ---
  const items = makeSection('道具属性', true);
  const itemFields: { label: string; get: () => number; set: (v: number) => void }[] = [
    { label: '红药水HP', get: () => CONFIG.items.redPotion.hp, set: (v) => { CONFIG.items.redPotion.hp = v; } },
    { label: '蓝药水HP', get: () => CONFIG.items.bluePotion.hp, set: (v) => { CONFIG.items.bluePotion.hp = v; } },
    { label: '红宝石攻', get: () => CONFIG.items.redGem.atk, set: (v) => { CONFIG.items.redGem.atk = v; } },
    { label: '蓝宝石防', get: () => CONFIG.items.blueGem.def, set: (v) => { CONFIG.items.blueGem.def = v; } },
  ];
  for (const f of itemFields) {
    const { row, valEl } = makeRow(f.label, f.get(),
      () => { f.set(Math.max(1, f.get() - 1)); valEl.textContent = String(f.get()); },
      () => { f.set(f.get() + 1); valEl.textContent = String(f.get()); },
    );
    items.content.appendChild(row);
  }
  body.appendChild(items.wrapper);

  // --- Monsters ---
  const monsters = makeSection('怪物数值', true);
  for (const [id, m] of Object.entries(CONFIG.monsters)) {
    const block = document.createElement('div');
    block.className = 'debug-monster-block';
    const nameEl = document.createElement('div');
    nameEl.className = 'debug-monster-name';
    nameEl.textContent = `${m.name} (${id})`;
    block.appendChild(nameEl);
    const monsterId = id as keyof typeof CONFIG.monsters;
    for (const stat of ['hp', 'atk', 'def', 'gold', 'exp'] as const) {
      const { row, valEl } = makeRow(stat, m[stat],
        () => { engine.debugAdjustMonster(id, stat, -1); valEl.textContent = String(CONFIG.monsters[monsterId][stat]); },
        () => { engine.debugAdjustMonster(id, stat, 1); valEl.textContent = String(CONFIG.monsters[monsterId][stat]); },
      );
      block.appendChild(row);
    }
    monsters.content.appendChild(block);
  }
  body.appendChild(monsters.wrapper);

  // --- Auto-update player values ---
  setInterval(() => {
    const p = engine.debugGetPlayer();
    if (!p) return;
    for (const { key, el, isInput } of playerSyncEls) {
      if (isInput) {
        const input = el as HTMLInputElement;
        if (document.activeElement !== input) {
          input.value = String((p as any)[key]);
        }
      } else {
        el.textContent = String((p as any)[key]);
      }
    }
  }, 200);

  panel.querySelectorAll('button').forEach((btn) => { btn.tabIndex = -1; });
}
