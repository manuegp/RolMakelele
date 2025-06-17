/**
 * Tipos para los eventos de socket.io
 */
import { Player, Character, GameRoom, GameAction, ActionResult, CharacterState } from './game.types';

// Eventos del cliente al servidor
export enum ClientEvents {
  JOIN_ROOM = 'join_room',
  CREATE_ROOM = 'create_room',
  LEAVE_ROOM = 'leave_room',
  SELECT_CHARACTERS = 'select_characters',
  READY = 'ready',
  PERFORM_ACTION = 'perform_action',
  JOIN_AS_SPECTATOR = 'join_as_spectator',
  CHAT_MESSAGE = 'chat_message'
}

// Eventos del servidor al cliente
export enum ServerEvents {
  ROOMS_LIST = 'rooms_list',
  ROOM_JOINED = 'room_joined',
  ROOM_UPDATED = 'room_updated',
  GAME_STARTED = 'game_started',
  TURN_STARTED = 'turn_started',
  ACTION_RESULT = 'action_result',
  GAME_ENDED = 'game_ended',
  ERROR = 'game_error',
  CHARACTERS_LIST = 'characters_list',
  CHAT_MESSAGE = 'chat_message'
}

// Tipos de datos para los eventos del cliente
export interface JoinRoomData {
  roomId: string;
  username: string;
}

export interface CreateRoomData {
  roomName: string;
  username: string;
}

export interface CharacterSelection {
  id: string;
  abilityIds: string[];
}

export interface SelectCharactersData {
  characters: CharacterSelection[];
}

export interface PerformActionData extends GameAction {}

export interface ChatMessageData {
  message: string;
}

// Tipos de datos para los eventos del servidor
export interface RoomsListData {
  rooms: {
    id: string;
    name: string;
    players: number;
    spectators: number;
    status: string;
  }[];
}

export interface RoomJoinedData {
  room: GameRoom;
}

export interface RoomUpdatedData {
  room: GameRoom;
}

export interface GameStartedData {
  room: GameRoom;
  turnOrder: {
    playerId: string;
    characterIndex: number;
    speed: number;
  }[];
}

export interface TurnStartedData {
  playerId: string;
  characterIndex: number;
  timeRemaining: number;
  effects: ActionResult['effects'];
}

export interface ActionResultData {
  result: ActionResult;
  nextTurn?: {
    playerId: string;
    characterIndex: number;
  };
}

export interface GameEndedData {
  winnerId: string;
  winnerUsername: string;
  reason?: string;
}

export interface ErrorData {
  message: string;
  code: string;
}

export interface CharactersListData {
  characters: Character[];
}

export interface ChatMessageReceivedData {
  username: string;
  message: string;
  /** Texto mostrado como tooltip al pasar el cursor */
  tooltip?: string;
  timestamp: Date;
  isSpectator: boolean;
  isSystem: boolean;
}

