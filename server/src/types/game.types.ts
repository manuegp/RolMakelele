/**
 * Interfaces y tipos para el juego de rol por turnos
 */

import { types } from "util";

// Estadísticas básicas de un personaje
export interface Stats {
  speed: number;
  health: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  critical: number;
  evasion: number;
}

// Tipos de efectos para las habilidades
export type EffectType = 'damage' | 'heal' | 'buff' | 'debuff' | 'status' | 'cure';
export type EffectTarget = 'self' | 'opponent' | 'allies';
export type StatType =
  | 'speed'
  | 'health'
  | 'attack'
  | 'defense'
  | 'specialAttack'
  | 'specialDefense'
  | 'critical'
  | 'evasion';

export type StatusCondition = 'burn' | 'paralysis' | 'drunk' | 'sleep';

// Definición de un efecto
export interface Effect {
  type: EffectType;
  target: EffectTarget;
  value: number;
  stat?: StatType;
  duration?: number;
  ignoreDefense?: number;
  status?: StatusCondition | null;
  /** Probability to apply the status (0-1) */
  statusChance?: number;
  /** Probability to apply the effect (0-1) */
  chance?: number;
  /** If true, heals the HP lost in addition to value */
  healLost?: boolean;
}

// Definición de una habilidad
export interface Ability {
  id: string;
  name: string;
  description: string;
  /** Tipo de habilidad: fisico, especial o de estado */
  category: 'physical' | 'special' | 'status';
  /** Tipo elemental o afinidad de la habilidad */
  type?: string;
  /** Indica si la habilidad es exclusiva de un personaje */
  unique?: boolean;
  effects: Effect[];
  /** Efectos adicionales de la habilidad */
  extraEffects?: Effect[];
  /** Ruta a la imagen que representa la habilidad */
  img?: string;
}

// Definición de un personaje
export interface Character {
  id: string;
  name: string;
  stats: Stats;
  /** Niveles de modificadores para cada estadística (-6 a 6) */
  statStages?: Stats;
  types: CharacterType[];
  availableAbilities: Ability[];
  abilities: Ability[];
  currentStats?: Stats;
  activeEffects?: {
    effect: Effect;
    remainingDuration: number;
  }[];
  status?: StatusCondition | null;
  statusTurns?: number;
}


export interface CharacterType {
  id:string;
  name: string;
  color: string;
}
// Estado de un personaje en juego
export interface CharacterState extends Character {
  currentHealth: number;
  isAlive: boolean;
  statStages?: Stats;
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
    status?: StatusCondition | null;
  }[];
  isDead?: boolean;
}

