/**
 * Interfaces y tipos para el juego de rol por turnos
 */

// Estadísticas básicas de un personaje
export interface Stats {
  speed: number;
  health: number;
  attack: number;
  defense: number;
}

// Tipos de efectos para las habilidades
export type EffectType = 'damage' | 'heal' | 'buff' | 'debuff';
export type EffectTarget = 'self' | 'opponent';
export type StatType = 'speed' | 'health' | 'attack' | 'defense';

// Definición de un efecto
export interface Effect {
  type: EffectType;
  target: EffectTarget;
  value: number;
  stat?: StatType;
  duration?: number;
  ignoreDefense?: number;
}

// Definición de una habilidad
export interface Ability {
  id: string;
  name: string;
  description: string;
  effects: Effect[];
}

// Definición de un personaje
export interface Character {
  id: string;
  name: string;
  stats: Stats;
  availableAbilities: Ability[];
  abilities?: Ability[];
  currentStats?: Stats;
  activeEffects?: {
    effect: Effect;
    remainingDuration: number;
  }[];
}

// Estado de un personaje en juego
export interface CharacterState extends Character {
  currentHealth: number;
  isAlive: boolean;
}

// Definición de un jugador
export interface Player {
  id: string;
  username: string;
  selectedCharacters: CharacterState[];
  isReady: boolean;
  isDisconnected?: boolean;
  disconnectedAt?: number;
}

// Estados posibles de una sala
export type RoomStatus = 'waiting' | 'character_selection' | 'in_game' | 'finished';

// Definición de una sala de juego
export interface GameRoom {
  id: string;
  name: string;
  players: Player[];
  spectators: string[];
  status: RoomStatus;
  maxPlayers: number;
  maxSpectators: number;
  currentTurn?: {
    playerId: string;
    characterIndex: number;
  };
  turnOrder?: {
    playerId: string;
    characterIndex: number;
    speed: number;
  }[];
  winner?: string;
  createdAt: Date;
}

// Definición de una acción en el juego
export interface GameAction {
  playerId: string;
  sourceCharacterIndex: number;
  targetPlayerId: string;
  targetCharacterIndex: number;
  abilityIndex: number;
}

// Resultado de una acción en el juego
export interface ActionResult {
  playerId: string;
  sourceCharacterIndex: number;
  targetPlayerId: string;
  targetCharacterIndex: number;
  ability: Ability;
  effects: {
    type: EffectType;
    target: 'source' | 'target';
    stat?: StatType;
    value: number;
    duration?: number;
  }[];
  isDead?: boolean;
}

