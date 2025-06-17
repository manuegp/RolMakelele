import { Server, Socket } from 'socket.io';
import config from '../config/config';
import { GameRoom, Player } from '../types/game.types';
import { ClientEvents, ServerEvents, JoinRoomData } from '../types/socket.types';
import { broadcastRoomsList } from '../utils/roomHelpers';
import { sendSystemMessage } from '../utils/messages';

export function registerJoinRoom(
  io: Server,
  socket: Socket,
  rooms: Map<string, GameRoom>,
  disconnectTimers: Map<string, NodeJS.Timeout>
) {
  socket.on(ClientEvents.JOIN_ROOM, (data: JoinRoomData) => {
    const room = rooms.get(data.roomId);

    if (!room) {
      socket.emit(ServerEvents.ERROR, {
        message: 'La sala no existe',
        code: 'ROOM_NOT_FOUND'
      });
      return;
    }

    // Comprobar si ya existe un jugador con ese nombre (reconexión)
    const existingIndex = room.players.findIndex(p => p.username === data.username);
    if (existingIndex !== -1) {
      const existing = room.players[existingIndex];
      if (existing.isDisconnected) {
        const oldId = existing.id;
        existing.id = socket.id;
        existing.isDisconnected = false;
        existing.disconnectedAt = undefined;
         if (room.turnOrder) {
          for (const turn of room.turnOrder) {
            if (turn.playerId === oldId) {
              turn.playerId = socket.id;
            }
          }
        }
        if (room.currentTurn && room.currentTurn.playerId === oldId) {
          room.currentTurn.playerId = socket.id;
        }
        const key = `${room.id}:${data.username}`;
        const timer = disconnectTimers.get(key);
        if (timer) {
          clearTimeout(timer);
          disconnectTimers.delete(key);
        }
        socket.join(data.roomId);
        socket.emit(ServerEvents.ROOM_JOINED, { room });
        io.to(data.roomId).emit(ServerEvents.ROOM_UPDATED, { room });
        sendSystemMessage(io, data.roomId, `${data.username} se ha reconectado`);
        return;
      } else {
        socket.emit(ServerEvents.ERROR, {
          message: 'Nombre de usuario en uso',
          code: 'USERNAME_TAKEN'
        });
        return;
      }
    }

    if (room.status !== 'waiting') {
      socket.emit(ServerEvents.ERROR, {
        message: 'No puedes unirte a una partida en curso',
        code: 'GAME_IN_PROGRESS'
      });
      return;
    }

    if (room.players.length >= room.maxPlayers) {
      socket.emit(ServerEvents.ERROR, {
        message: 'La sala está llena',
        code: 'ROOM_FULL'
      });
      return;
    }

    const player: Player = {
      id: socket.id,
      username: data.username,
      selectedCharacters: [],
      isReady: false
    };

    room.players.push(player);
    if (room.players.length === config.maxPlayersPerRoom && room.status === 'waiting') {
      room.status = 'character_selection';
    }
    socket.join(data.roomId);
    socket.emit(ServerEvents.ROOM_JOINED, { room });

    io.to(data.roomId).emit(ServerEvents.ROOM_UPDATED, { room });

    broadcastRoomsList(io, rooms);
  });
}
