// 玩家身份信息：姓名 + 年龄，独立于游戏存档
// localStorage key 与存档 `birthday-tower-save` 严格分离，互不污染。

const PROFILE_KEY = 'birthday-tower-player';
const MIN_AGE = 1;
const MAX_AGE = 120;
const MAX_NAME_LEN = 16;

export interface PlayerProfile {
  name: string;
  age: number;
}

export function loadProfile(): PlayerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const age = typeof data.age === 'number' ? data.age : Number.NaN;
    if (!name) return null;
    if (!Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) return null;
    return { name, age };
  } catch {
    return null;
  }
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  localStorage.removeItem(PROFILE_KEY);
}

function validateName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_NAME_LEN) return null;
  return trimmed;
}

function validateAge(raw: string): number | null {
  if (!raw.trim()) return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  if (!Number.isInteger(num)) return null;
  if (num < MIN_AGE || num > MAX_AGE) return null;
  return num;
}

/**
 * 弹出入口 modal，等用户输入有效的姓名和年龄后写入 localStorage，
 * 返回最终的 profile。如果已有 profile 且未要求强制输入，则直接返回。
 */
export function ensurePlayerProfile(options: { force?: boolean } = {}): Promise<PlayerProfile> {
  const existing = loadProfile();
  if (existing && !options.force) return Promise.resolve(existing);

  return new Promise<PlayerProfile>((resolve) => {
    const overlay = document.querySelector<HTMLElement>('#player-input-overlay');
    if (!overlay) {
      // 没有 modal 元素是不应该发生的，但是给个兜底避免完全卡死。
      const fallback: PlayerProfile = existing ?? { name: '玩家', age: 10 };
      resolve(fallback);
      return;
    }

    const nameInput = overlay.querySelector<HTMLInputElement>('#player-name-input')!;
    const ageInput = overlay.querySelector<HTMLInputElement>('#player-age-input')!;
    const submitBtn = overlay.querySelector<HTMLButtonElement>('#player-input-submit')!;
    const errorEl = overlay.querySelector<HTMLElement>('#player-input-error')!;

    // 区分两种打开模式：
    //  - initial: 首次进入（没有现有 profile）→ ESC 只清空输入 + 重新聚焦，不能关 modal。
    //  - edit：修改我的资料（已有 profile + force）→ ESC 关 modal，resolve 原 profile。
    const mode: 'initial' | 'edit' = existing ? 'edit' : 'initial';

    // 预填已有值（用于"修改资料"场景）
    nameInput.value = existing?.name ?? '';
    ageInput.value = existing ? String(existing.age) : '';
    errorEl.textContent = '';

    const updateButtonState = () => {
      const name = validateName(nameInput.value);
      const age = validateAge(ageInput.value);
      submitBtn.disabled = !(name && age !== null);
    };

    const onInput = () => {
      errorEl.textContent = '';
      updateButtonState();
    };

    const submit = () => {
      const name = validateName(nameInput.value);
      const age = validateAge(ageInput.value);
      if (!name) {
        errorEl.textContent = '请输入姓名（1-16 个字符）';
        nameInput.focus();
        return;
      }
      if (age === null) {
        errorEl.textContent = `请输入有效年龄（${MIN_AGE}-${MAX_AGE} 的整数）`;
        ageInput.focus();
        return;
      }
      const profile: PlayerProfile = { name, age };
      saveProfile(profile);
      cleanup();
      resolve(profile);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !submitBtn.disabled) {
        e.preventDefault();
        submit();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (mode === 'edit' && existing) {
          // 修改模式：取消 → 保留原 profile，关 modal
          cleanup();
          resolve(existing);
        } else {
          // 首次进入：不能关 modal否则 bootstrap 卡死，只清空 + 重聚焦
          nameInput.value = '';
          ageInput.value = '';
          errorEl.textContent = '';
          updateButtonState();
          nameInput.focus();
        }
        return;
      }
      if (e.key === 'Tab') {
        // Focus trap：在姓名 input → 年龄 input → submit 按钮 三者间循环
        const focusables: HTMLElement[] = [nameInput, ageInput];
        if (!submitBtn.disabled) focusables.push(submitBtn);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !active || !focusables.includes(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !active || !focusables.includes(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    const cleanup = () => {
      overlay.classList.remove('visible');
      nameInput.removeEventListener('input', onInput);
      ageInput.removeEventListener('input', onInput);
      submitBtn.removeEventListener('click', submit);
      overlay.removeEventListener('keydown', onKey);
    };

    nameInput.addEventListener('input', onInput);
    ageInput.addEventListener('input', onInput);
    submitBtn.addEventListener('click', submit);
    overlay.addEventListener('keydown', onKey);

    overlay.classList.add('visible');
    updateButtonState();
    // 给一帧的时间渲染后再 focus
    setTimeout(() => nameInput.focus(), 0);
  });
}
