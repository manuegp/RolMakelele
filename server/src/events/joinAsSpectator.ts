import { Server, Socket } from 'socket.io';
import { GameRoom } from '../types/game.types';
import { ClientEvents, ServerEvents, JoinRoomData } from '../types/socket.types';

export function registerJoinAsSpectator(
  io: Server,
  socket: Socket,
  rooms: Map<string, GameRoom>
) {
  socket.on(ClientEvents.JOIN_AS_SPECTATOR, (data: JoinRoomData) => {
    const room = rooms.get(data.roomId);

    if (!room) {
      socket.emit(ServerEvents.ERROR, {
        message: 'La sala no existe',
        code: 'ROOM_NOT_FOUND'
      });
      return;
    }

    if (room.spectators.length >= room.maxSpectators) {
      socket.emit(ServerEvents.ERROR, {
        message: 'No hay más espacio para espectadores',
        code: 'SPECTATORS_FULL'
      });
      return;
    }

    room.spectators.push(socket.id);
    socket.join(data.roomId);
    socket.emit(ServerEvents.ROOM_JOINED, { room });

    io.to(data.roomId).emit(ServerEvents.ROOM_UPDATED, { room });

    io.to(data.roomId).emit(ServerEvents.CHAT_MESSAGE, {
      username: 'Sistema',
      message: `${data.username} se ha unido como espectador`,
      timestamp: new Date(),
      isSpectator: true
    });
  });
}
