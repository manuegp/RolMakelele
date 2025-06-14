import { Server, Socket } from 'socket.io';
import config from '../config/config';
import { GameRoom, Player } from '../types/game.types';
import { ClientEvents, ServerEvents } from '../types/socket.types';
import { broadcastRoomsList, findPlayerRoom } from '../utils/roomHelpers';

export function registerReady(
  io: Server,
  socket: Socket,
  rooms: Map<string, GameRoom>
) {
  socket.on(ClientEvents.READY, () => {
    const found = findPlayerRoom(rooms, socket.id);
    let playerRoom: GameRoom | undefined = found?.room;
    let player: Player | undefined = found?.player;

    if (!playerRoom || !player) {
      socket.emit(ServerEvents.ERROR, {
        message: 'No estás en ninguna sala',
        code: 'NOT_IN_ROOM'
      });
      return;
    }

    if (playerRoom.status !== 'character_selection') {
      socket.emit(ServerEvents.ERROR, {
        message: 'No puedes marcar como listo en este momento',
        code: 'INVALID_GAME_STATE'
      });
      return;
    }

    if (player.selectedCharacters.length !== config.maxCharactersPerPlayer) {
      socket.emit(ServerEvents.ERROR, {
        message: 'Debes seleccionar personajes antes de marcar como listo',
        code: 'CHARACTERS_NOT_SELECTED'
      });
      return;
    }

    const playerIndex = playerRoom.players.findIndex(p => p.id === socket.id);
    playerRoom.players[playerIndex].isReady = !playerRoom.players[playerIndex].isReady;

    const allReady = playerRoom.players.length === config.maxPlayersPerRoom &&
                     playerRoom.players.every(p => p.isReady);
    if (allReady) {
      playerRoom.status = 'in_game';
      const turnOrder: { playerId: string; characterIndex: number; speed: number }[] = [];

      for (const p of playerRoom.players) {
        for (let i = 0; i < p.selectedCharacters.length; i++) {
          turnOrder.push({
            playerId: p.id,
            characterIndex: i,
            speed: p.selectedCharacters[i].currentStats?.speed || p.selectedCharacters[i].stats.speed
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
      io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
        username: 'Sistema',
        message: 'El juego ha comenzado',
        timestamp: new Date(),
        isSpectator: false,
        isSystem: true
      });

      io.to(playerRoom.id).emit(ServerEvents.TURN_STARTED, {
        playerId: turnOrder[0].playerId,
        characterIndex: turnOrder[0].characterIndex,
        timeRemaining: config.turnTimeLimit
      });

      broadcastRoomsList(io, rooms);
    } else {
      io.to(playerRoom.id).emit(ServerEvents.ROOM_UPDATED, { room: playerRoom });
    }
  });
}
