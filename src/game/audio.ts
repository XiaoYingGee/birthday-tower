const SFX_NAMES = ['floor', 'attack', 'item', 'gem', 'door', 'drink', 'recovery', 'save', 'confirm', 'chapter'] as const;
const BGM_NAMES = ['tower', 'towerBoss'] as const;

export type SFXName = typeof SFX_NAMES[number];
export type BGMName = typeof BGM_NAMES[number];

const STORAGE_KEY = 'birthday-tower-muted';
const SFX_VOLUME = 0.5;
const BGM_VOLUME = 0.3;
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

  constructor() {
    this.muted = localStorage.getItem(STORAGE_KEY) === 'true';
    this.preloadSFX();
  }

  private preloadSFX(): void {
    for (const name of SFX_NAMES) {
      const pool: HTMLAudioElement[] = [];
      for (let i = 0; i < POOL_SIZE; i++) {
        const audio = new Audio(`/audio/sfx/${name}.mp3`);
        audio.volume = this.muted ? 0 : SFX_VOLUME;
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
    audio.volume = SFX_VOLUME;
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

    audio.volume = this.muted ? 0 : BGM_VOLUME;
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
    localStorage.setItem(STORAGE_KEY, String(muted));

    for (const pool of this.sfxPools.values()) {
      for (const audio of pool) {
        audio.volume = muted ? 0 : SFX_VOLUME;
      }
    }

    if (this.currentBGM) {
      this.currentBGM.volume = muted ? 0 : BGM_VOLUME;
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }
}
