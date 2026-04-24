import type { PlayerState } from '../entities/player';
import type { FloorDefinition } from '../data/floor';
import type { AudioManager } from '../game/audio';

export interface GameContext {
  player: PlayerState;
  floors: FloorDefinition[];
  floorIndex: number;
  readonly currentFloor: FloorDefinition;
  readonly playerName: string;
  readonly audio: AudioManager;
  showMessage(text: string): void;
  addFloatingText(text: string, x: number, y: number, color: string, start: number, duration: number): void;
  save(): void;
  placePlayer(x: number, y: number): void;
}
