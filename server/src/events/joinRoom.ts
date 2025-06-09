import { Server, Socket } from 'socket.io';
import config from '../config/config';
import { GameRoom, Player } from '../types/game.types';
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
    socket.join(data.roomId);
    socket.emit(ServerEvents.ROOM_JOINED, { room });

    io.to(data.roomId).emit(ServerEvents.ROOM_UPDATED, { room });

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
