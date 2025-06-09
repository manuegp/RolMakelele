
import { v4 as uuidv4 } from 'uuid';
import { Server, Socket, } from 'socket.io';
import { CreateRoomData, ServerEvents } from '../types/socket.types';
import { Player, GameRoom } from '../types/game.types';
import config from '../config/config';

export const create_room = (data: CreateRoomData) => {
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
    
    // Añadir al jugador como primer jugador
    const player: Player = {
      id: socket.id,
      username: data.username,
      selectedCharacters: [],
      isReady: false
    };
    
    newRoom.players.push(player);
    rooms.set(roomId, newRoom);
    
    // Unir al socket a la sala
    socket.join(roomId);
    
    // Notificar al cliente que se unió correctamente
    socket.emit(ServerEvents.ROOM_JOINED, { room: newRoom });
    
    // Actualizar la lista de salas para todos
    io.emit(ServerEvents.ROOMS_LIST, { 
      rooms: Array.from(rooms.values()).map(r => ({
        id: r.id,
        name: r.name,
        players: r.players.length,
        spectators: r.spectators.length,
        status: r.status
      }))
    });
  }