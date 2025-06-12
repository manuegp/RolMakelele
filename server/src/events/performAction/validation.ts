import { Server, Socket } from "socket.io";
import { GameRoom, Player, CharacterState, Ability } from "../../types/game.types";
import { ServerEvents, PerformActionData } from "../../types/socket.types";
import { findPlayerRoom } from '../../utils/roomHelpers';

export interface ValidationContext {
  playerRoom: GameRoom;
  sourcePlayer: Player;
  targetPlayer: Player;
  sourceCharacter: CharacterState;
  targetCharacter: CharacterState;
  ability: Ability;
}

export function validateAction(
  io: Server,
  socket: Socket,
  rooms: Map<string, GameRoom>,
  data: PerformActionData
): ValidationContext | null {
  const found = findPlayerRoom(rooms, socket.id);
  const playerRoom = found?.room;

  if (!playerRoom) {
    socket.emit(ServerEvents.ERROR, {
      message: 'No estás en ninguna sala',
      code: 'NOT_IN_ROOM'
    });
    return null;
  }

  if (playerRoom.status !== 'in_game') {
    socket.emit(ServerEvents.ERROR, {
      message: 'El juego no está en curso',
      code: 'GAME_NOT_IN_PROGRESS'
    });
    return null;
  }

  if (!playerRoom.currentTurn || playerRoom.currentTurn.playerId !== socket.id) {
    socket.emit(ServerEvents.ERROR, {
      message: 'No es tu turno',
      code: 'NOT_YOUR_TURN'
    });
    return null;
  }

  const sourcePlayer = playerRoom.players.find(p => p.id === socket.id);
  const targetPlayer = playerRoom.players.find(p => p.id === data.targetPlayerId);

  if (!sourcePlayer || !targetPlayer) {
    socket.emit(ServerEvents.ERROR, {
      message: 'Jugador no encontrado',
      code: 'PLAYER_NOT_FOUND'
    });
    return null;
  }

  if (
    data.sourceCharacterIndex < 0 ||
    data.sourceCharacterIndex >= sourcePlayer.selectedCharacters.length
  ) {
    socket.emit(ServerEvents.ERROR, {
      message: 'Índice de personaje de origen inválido',
      code: 'INVALID_SOURCE_INDEX'
    });
    return null;
  }

  if (
    data.targetCharacterIndex < 0 ||
    data.targetCharacterIndex >= targetPlayer.selectedCharacters.length
  ) {
    socket.emit(ServerEvents.ERROR, {
      message: 'Índice de personaje objetivo inválido',
      code: 'INVALID_TARGET_INDEX'
    });
    return null;
  }

  if (
    data.abilityIndex < 0 ||
    data.abilityIndex >= sourcePlayer.selectedCharacters[data.sourceCharacterIndex].abilities.length
  ) {
    socket.emit(ServerEvents.ERROR, {
      message: 'Índice de habilidad inválido',
      code: 'INVALID_ABILITY_INDEX'
    });
    return null;
  }

  if (!sourcePlayer.selectedCharacters[data.sourceCharacterIndex].isAlive) {
    socket.emit(ServerEvents.ERROR, {
      message: 'El personaje de origen está derrotado',
      code: 'SOURCE_CHARACTER_DEFEATED'
    });
    return null;
  }

  if (!targetPlayer.selectedCharacters[data.targetCharacterIndex].isAlive) {
    socket.emit(ServerEvents.ERROR, {
      message: 'El personaje objetivo está derrotado',
      code: 'TARGET_CHARACTER_DEFEATED'
    });
    return null;
  }

  const sourceCharacter = sourcePlayer.selectedCharacters[data.sourceCharacterIndex];
  const targetCharacter = targetPlayer.selectedCharacters[data.targetCharacterIndex];
  const ability = sourceCharacter.abilities[data.abilityIndex];

  return {
    playerRoom,
    sourcePlayer,
    targetPlayer,
    sourceCharacter,
    targetCharacter,
    ability
  };
}

