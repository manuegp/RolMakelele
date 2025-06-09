import { v4 as uuidv4 } from 'uuid';
import { Server, Socket } from 'socket.io';
import { CreateRoomData, ServerEvents } from '../types/socket.types';
import { Player, GameRoom } from '../types/game.types';
import config from '../config/config';

export function createRoomHandler(io: Server, rooms: Map<string, GameRoom>) {
  return (socket: Socket) => (data: CreateRoomData): void => {
    const roomId = uuidv4();
    const newRoom: GameRoom = {
      id: roomId,
      name: data.roomName,
      players: [],
      spectators: [],
      status: 'waiting',
      maxPlayers: config.maxPlayersPerRoom,
      maxSpectators: config.maxSpectatorsPerRoom,
      createdAt: new Date()
    };

    const player: Player = {
      id: socket.id,
      username: data.username,
      selectedCharacters: [],
      isReady: false
    };

    newRoom.players.push(player);
    rooms.set(roomId, newRoom);

    socket.join(roomId);
    socket.emit(ServerEvents.ROOM_JOINED, { room: newRoom });

    io.emit(ServerEvents.ROOMS_LIST, {
      rooms: Array.from(rooms.values()).map(r => ({
        id: r.id,
        name: r.name,
        players: r.players.length,
        spectators: r.spectators.length,
        status: r.status
      }))
    });
  };
}
