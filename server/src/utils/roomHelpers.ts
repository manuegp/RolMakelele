import { Server } from 'socket.io';
import { GameRoom, Player } from '../types/game.types';
import { ServerEvents } from '../types/socket.types';

export function getRoomsListData(rooms: Map<string, GameRoom>) {
  return {
    rooms: Array.from(rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      players: room.players.length,
      spectators: room.spectators.length,
      status: room.status
    }))
  };
}

export function broadcastRoomsList(io: Server, rooms: Map<string, GameRoom>) {
  io.emit(ServerEvents.ROOMS_LIST, getRoomsListData(rooms));
}

export function findPlayerRoom(
  rooms: Map<string, GameRoom>,
  socketId: string
): { room: GameRoom; player: Player } | undefined {
  for (const [, room] of rooms.entries()) {
    const idx = room.players.findIndex(p => p.id === socketId);
    if (idx !== -1) {
      return { room, player: room.players[idx] };
    }
  }
  return undefined;
}
