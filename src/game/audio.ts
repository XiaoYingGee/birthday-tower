const SFX_NAMES = ['floor', 'attack', 'item', 'gem', 'door', 'drink', 'recovery', 'save', 'confirm', 'chapter'] as const;
const BGM_NAMES = ['tower', 'towerBoss', 'birthday'] as const;

export type SFXName = typeof SFX_NAMES[number];
export type BGMName = typeof BGM_NAMES[number];

const MUTED_KEY = 'birthday-tower-muted';
const BGM_VOL_KEY = 'birthday-tower-bgm-volume';
const SFX_VOL_KEY = 'birthday-tower-sfx-volume';
const DEFAULT_SFX_VOLUME = 0.5;
const DEFAULT_BGM_VOLUME = 0.15;

/**
 * Web Audio 实现：SFX 用 AudioBufferSourceNode，零延迟、不阻塞主线程。
 * BGM 仍用 HTMLAudioElement（流式播放更省内存，循环更稳）。
 */
export class AudioManager {
  private ctx?: AudioContext;
  private sfxGain?: GainNode;
  private sfxBuffers = new Map<SFXName, AudioBuffer>();
  private bgmElements = new Map<BGMName, HTMLAudioElement>();
  private currentBGM?: HTMLAudioElement;
  private currentBGMName?: BGMName;
  private muted: boolean;
  private userInteracted = false;
  private pendingBGM?: BGMName;
  private bgmVol: number;
  private sfxVol: number;

  constructor() {
    this.muted = localStorage.getItem(MUTED_KEY) === 'true';
    this.bgmVol = parseFloat(localStorage.getItem(BGM_VOL_KEY) ?? '') || DEFAULT_BGM_VOLUME;
    this.sfxVol = parseFloat(localStorage.getItem(SFX_VOL_KEY) ?? '') || DEFAULT_SFX_VOLUME;
    // 不在构造函数里建 AudioContext —— 必须等用户交互后再建
  }

  private async ensureContext(): Promise<AudioContext | undefined> {
    if (this.ctx) return this.ctx;
    if (!this.userInteracted) return undefined;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.muted ? 0 : this.sfxVol;
      this.sfxGain.connect(this.ctx.destination);
      // 异步预加载所有 SFX，不阻塞
      void this.preloadAllSFX();
    } catch {
      // 不支持 Web Audio，降级（极罕见）
    }
    return this.ctx;
  }

  private async preloadAllSFX(): Promise<void> {
    if (!this.ctx) return;
    const ctx = this.ctx;
    await Promise.all(
      SFX_NAMES.map(async (name) => {
        try {
          const res = await fetch(`/audio/sfx/${name}.mp3`);
          const buf = await res.arrayBuffer();
          const audioBuf = await ctx.decodeAudioData(buf);
          this.sfxBuffers.set(name, audioBuf);
        } catch {
          // 忽略单个失败
        }
      })
    );
  }

  playSFX(name: SFXName): void {
    if (this.muted) return;
    if (!this.ctx || !this.sfxGain) return; // 还没初始化（用户还没交互），静默放弃
    const buf = this.sfxBuffers.get(name);
    if (!buf) return; // 还没 decode 完，静默放弃（首次几百毫秒内）
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.sfxGain);
    src.start(0);
    // 播完自动 GC，无需手动管理
  }

  playBGM(name: BGMName): void {
    if (name === this.currentBGMName) return;
    this.pendingBGM = name;
    if (!this.userInteracted) return;
    this.startBGM(name);
  }

  private startBGM(name: BGMName): void {
    if (this.currentBGM) {
      this.currentBGM.pause();
      this.currentBGM.currentTime = 0;
    }

    let audio = this.bgmElements.get(name);
    if (!audio) {
      audio = new Audio(`/audio/bgm/${name}.mp3`);
      audio.loop = true;
      this.bgmElements.set(name, audio);
    }

    audio.volume = this.muted ? 0 : this.bgmVol;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    this.currentBGM = audio;
    this.currentBGMName = name;
    this.pendingBGM = undefined;
  }

  notifyUserInteraction(): void {
    if (this.userInteracted) return;
    this.userInteracted = true;
    void this.ensureContext();
    if (this.pendingBGM) {
      this.startBGM(this.pendingBGM);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(MUTED_KEY, String(muted));
    if (this.sfxGain) this.sfxGain.gain.value = muted ? 0 : this.sfxVol;
    if (this.currentBGM) this.currentBGM.volume = muted ? 0 : this.bgmVol;
  }

  get isMuted(): boolean { return this.muted; }

  setBGMVolume(v: number): void {
    this.bgmVol = v;
    localStorage.setItem(BGM_VOL_KEY, String(v));
    if (this.currentBGM && !this.muted) this.currentBGM.volume = v;
  }

  setSFXVolume(v: number): void {
    this.sfxVol = v;
    localStorage.setItem(SFX_VOL_KEY, String(v));
    if (this.sfxGain && !this.muted) this.sfxGain.gain.value = v;
  }

  getBGMVolume(): number { return this.bgmVol; }
  getSFXVolume(): number { return this.sfxVol; }
}
