import { Server, Socket } from 'socket.io';
import config from '../config/config';
import { GameRoom, Player } from '../types/game.types';
import { sanitizeRoom } from '../utils/sanitizeRoom';
import { ClientEvents, ServerEvents, JoinRoomData } from '../types/socket.types';

export function registerJoinRoom(
  io: Server,
  socket: Socket,
  rooms: Map<string, GameRoom>
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

    const existingPlayer = room.players.find(p => p.username === data.username);
    if (existingPlayer) {
      if (!existingPlayer.connected) {
        // Reconexion a partida en curso
        existingPlayer.id = socket.id;
        existingPlayer.connected = true;
        if (existingPlayer.reconnectTimer) {
          clearTimeout(existingPlayer.reconnectTimer);
          existingPlayer.reconnectTimer = undefined;
        }
        socket.join(data.roomId);
        socket.emit(ServerEvents.ROOM_JOINED, { room: sanitizeRoom(room) });

        io.to(data.roomId).emit(ServerEvents.ROOM_UPDATED, { room: sanitizeRoom(room) });
        return;
      } else {
        socket.emit(ServerEvents.ERROR, {
          message: 'El nombre de usuario ya está en uso en esta sala',
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
      isReady: false,
      connected: true
    };

    room.players.push(player);
    if (room.players.length === config.maxPlayersPerRoom && room.status === 'waiting') {
      room.status = 'character_selection';
    }
    socket.join(data.roomId);
    socket.emit(ServerEvents.ROOM_JOINED, { room: sanitizeRoom(room) });

    io.to(data.roomId).emit(ServerEvents.ROOM_UPDATED, { room: sanitizeRoom(room) });

    io.emit(ServerEvents.ROOMS_LIST, {
      rooms: Array.from(rooms.values()).map(r => ({
        id: r.id,
        name: r.name,
        players: r.players.length,
        spectators: r.spectators.length,
        status: r.status
      }))
    });
  });
}
