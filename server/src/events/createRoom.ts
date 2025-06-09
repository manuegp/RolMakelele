import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config';
import { GameRoom, Player } from '../types/game.types';
import { ClientEvents, ServerEvents, CreateRoomData } from '../types/socket.types';

export function registerCreateRoom(
  io: Server,
  socket: Socket,
  rooms: Map<string, GameRoom>
) {
  socket.on(ClientEvents.CREATE_ROOM, (data: CreateRoomData) => {
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
      isReady: false,
      connected: true
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
  });
}
