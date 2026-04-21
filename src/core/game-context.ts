import type { PlayerState } from '../entities/player';
import type { FloorDefinition } from '../data/floor';

export interface GameContext {
  player: PlayerState;
  floors: FloorDefinition[];
  floorIndex: number;
  readonly currentFloor: FloorDefinition;
  readonly playerName: string;
  showMessage(text: string): void;
  addFloatingText(text: string, x: number, y: number, color: string, start: number, duration: number): void;
  save(): void;
  placePlayer(x: number, y: number): void;
}
