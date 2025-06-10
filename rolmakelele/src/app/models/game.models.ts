export interface Stats {
  speed: number;
  health: number;
  attack: number;
  defense: number;
}

export type EffectType = 'damage' | 'heal' | 'buff' | 'debuff';
export type EffectTarget = 'self' | 'opponent';
export type StatType = 'speed' | 'health' | 'attack' | 'defense';

export interface Effect {
  type: EffectType;
  target: EffectTarget;
  value: number;
  stat?: StatType;
  duration?: number;
  ignoreDefense?: number;
}

export interface Ability {
  name: string;
  description: string;
  effects: Effect[];
  cooldown: number;
  currentCooldown?: number;
}

export interface Character {
  id: string;
  name: string;
  stats: Stats;
  abilities: Ability[];
  currentStats?: Stats;
  activeEffects?: {
    effect: Effect;
    remainingDuration: number;
  }[];
}

export interface CharacterState extends Character {
  currentHealth: number;
  isAlive: boolean;
}

export interface Player {
  id: string;
  username: string;
  selectedCharacters: CharacterState[];
  isReady: boolean;
  isDisconnected?: boolean;
  disconnectedAt?: number;
}

export type RoomStatus = 'waiting' | 'character_selection' | 'in_game' | 'finished';

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

export interface GameAction {
  playerId: string;
  sourceCharacterIndex: number;
  targetPlayerId: string;
  targetCharacterIndex: number;
  abilityIndex: number;
}

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
