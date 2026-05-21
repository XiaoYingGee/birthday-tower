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
