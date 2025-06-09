import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config';
import { GameRoom, Player } from '../types/game.types';
import { ClientEvents, ServerEvents, CreateRoomData } from '../types/socket.types';
import { broadcastRoomsList } from '../utils/roomHelpers';

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
      isReady: false
    };

    newRoom.players.push(player);
    rooms.set(roomId, newRoom);

    socket.join(roomId);
    socket.emit(ServerEvents.ROOM_JOINED, { room: newRoom });

    broadcastRoomsList(io, rooms);
  });
}
