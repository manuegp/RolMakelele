import { Server, Socket } from 'socket.io';
import config from '../config/config';
import characterService from '../models/character.model';
import { GameRoom, Player, CharacterState } from '../types/game.types';
import { ClientEvents, ServerEvents, SelectCharactersData } from '../types/socket.types';

export function registerSelectCharacters(
  io: Server,
  socket: Socket,
  rooms: Map<string, GameRoom>
) {
  socket.on(ClientEvents.SELECT_CHARACTERS, (data: SelectCharactersData) => {
    let playerRoom: GameRoom | undefined;
    let player: Player | undefined;

    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        playerRoom = room;
        player = room.players[playerIndex];
        break;
      }
    }

    if (!playerRoom || !player) {
      socket.emit(ServerEvents.ERROR, {
        message: 'No estás en ninguna sala',
        code: 'NOT_IN_ROOM'
      });
      return;
    }

    if (playerRoom.status !== 'waiting' && playerRoom.status !== 'character_selection') {
      socket.emit(ServerEvents.ERROR, {
        message: 'No puedes seleccionar personajes en este momento',
        code: 'INVALID_GAME_STATE'
      });
      return;
    }

    if (data.characterIds.length !== config.maxCharactersPerPlayer) {
      socket.emit(ServerEvents.ERROR, {
        message: `Debes seleccionar exactamente ${config.maxCharactersPerPlayer} personajes`,
        code: 'INVALID_CHARACTER_COUNT'
      });
      return;
    }

    const selectedCharacters: CharacterState[] = [];
    for (const charId of data.characterIds) {
      const character = characterService.getCharacterById(charId);
      if (!character) {
        socket.emit(ServerEvents.ERROR, {
          message: `Personaje con ID ${charId} no encontrado`,
          code: 'CHARACTER_NOT_FOUND'
        });
        return;
      }
      selectedCharacters.push(characterService.characterToCharacterState(character));
    }

    const playerIndex = playerRoom.players.findIndex(p => p.id === socket.id);
    playerRoom.players[playerIndex].selectedCharacters = selectedCharacters;

    if (playerRoom.status === 'waiting') {
      playerRoom.status = 'character_selection';
    }

    const allSelected =
      playerRoom.players.length === config.maxPlayersPerRoom &&
      playerRoom.players.every(
        p => p.selectedCharacters.length === config.maxCharactersPerPlayer
      );

    if (allSelected) {
      playerRoom.status = 'in_game';
      const turnOrder: { playerId: string; characterIndex: number; speed: number }[] = [];

      for (const p of playerRoom.players) {
        for (let i = 0; i < p.selectedCharacters.length; i++) {
          turnOrder.push({
            playerId: p.id,
            characterIndex: i,
            speed:
              p.selectedCharacters[i].currentStats?.speed ||
              p.selectedCharacters[i].stats.speed
          });
        }
      }

      turnOrder.sort((a, b) => b.speed - a.speed);
      playerRoom.turnOrder = turnOrder;
      playerRoom.currentTurn = turnOrder[0];

      io.to(playerRoom.id).emit(ServerEvents.GAME_STARTED, {
        room: playerRoom,
        turnOrder
      });

      io.to(playerRoom.id).emit(ServerEvents.TURN_STARTED, {
        playerId: turnOrder[0].playerId,
        characterIndex: turnOrder[0].characterIndex,
        timeRemaining: config.turnTimeLimit
      });

      io.emit(ServerEvents.ROOMS_LIST, {
        rooms: Array.from(rooms.values()).map(r => ({
          id: r.id,
          name: r.name,
          players: r.players.length,
          spectators: r.spectators.length,
          status: r.status
        }))
      });
    } else {
      io.to(playerRoom.id).emit(ServerEvents.ROOM_UPDATED, { room: playerRoom });
    }
  });
}
