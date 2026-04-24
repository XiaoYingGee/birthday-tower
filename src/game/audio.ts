const SFX_NAMES = ['floor', 'attack', 'item', 'gem', 'door', 'drink', 'recovery', 'save', 'confirm', 'chapter'] as const;
const BGM_NAMES = ['tower', 'towerBoss', 'birthday'] as const;

export type SFXName = typeof SFX_NAMES[number];
export type BGMName = typeof BGM_NAMES[number];

const MUTED_KEY = 'birthday-tower-muted';
const BGM_VOL_KEY = 'birthday-tower-bgm-volume';
const SFX_VOL_KEY = 'birthday-tower-sfx-volume';
const DEFAULT_SFX_VOLUME = 0.5;
const DEFAULT_BGM_VOLUME = 0.15;
const POOL_SIZE = 3;

export class AudioManager {
  private sfxPools = new Map<SFXName, HTMLAudioElement[]>();
  private sfxIndex = new Map<SFXName, number>();
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
    this.preloadSFX();
  }

  private preloadSFX(): void {
    for (const name of SFX_NAMES) {
      const pool: HTMLAudioElement[] = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        const audio = new Audio(`/audio/sfx/${name}.mp3`);
        audio.volume = this.muted ? 0 : this.sfxVol;
        audio.preload = 'auto';
        pool.push(audio);
      }
      this.sfxPools.set(name, pool);
      this.sfxIndex.set(name, 0);
    }
  }

  playSFX(name: SFXName): void {
    if (this.muted) return;
    const pool = this.sfxPools.get(name);
    if (!pool) return;
    const idx = this.sfxIndex.get(name)!;
    const audio = pool[idx];
    this.sfxIndex.set(name, (idx + 1) % POOL_SIZE);
    audio.currentTime = 0;
    audio.volume = this.sfxVol;
    audio.play().catch(() => {});
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
    if (this.pendingBGM) {
      this.startBGM(this.pendingBGM);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    localStorage.setItem(MUTED_KEY, String(muted));

    for (const pool of this.sfxPools.values()) {
      for (const audio of pool) {
        audio.volume = muted ? 0 : this.sfxVol;
      }
    }

    if (this.currentBGM) {
      this.currentBGM.volume = muted ? 0 : this.bgmVol;
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setBGMVolume(v: number): void {
    this.bgmVol = v;
    localStorage.setItem(BGM_VOL_KEY, String(v));
    if (this.currentBGM && !this.muted) {
      this.currentBGM.volume = v;
    }
  }

  setSFXVolume(v: number): void {
    this.sfxVol = v;
    localStorage.setItem(SFX_VOL_KEY, String(v));
    for (const pool of this.sfxPools.values()) {
      for (const audio of pool) {
        audio.volume = this.muted ? 0 : v;
      }
    }
  }

  getBGMVolume(): number { return this.bgmVol; }
  getSFXVolume(): number { return this.sfxVol; }
}
