import { Server, Socket } from "socket.io";
import { GameRoom } from "../types/game.types";
import { ClientEvents, ServerEvents } from "../types/socket.types";
import { broadcastRoomsList } from '../utils/roomHelpers';

export function registerLeaveRoom(io: Server, socket: Socket, rooms: Map<string, GameRoom>) {

  socket.on(ClientEvents.LEAVE_ROOM, () => {
    // Buscar todas las salas donde está el jugador o espectador
    for (const [roomId, room] of rooms.entries()) {
      // Buscar como jugador
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        // Eliminar al jugador
        room.players.splice(playerIndex, 1);
        
        // Si era el último jugador, eliminar la sala
        if (room.players.length === 0 && room.spectators.length === 0) {
          rooms.delete(roomId);
        } else if (room.status === 'in_game') {
          // Si el juego estaba en curso, el otro jugador gana automáticamente
          room.status = 'finished';

          // Determinar el ganador (el otro jugador)
          const winner = room.players[0];
          if (winner) {
            room.winner = winner.id;

            // Notificar que el juego ha terminado
            io.to(roomId).emit(ServerEvents.GAME_ENDED, {
              winnerId: winner.id,
              winnerUsername: winner.username,
              reason: 'player_left'
            });
            io.to(roomId).emit(ServerEvents.CHAT_MESSAGE, {
              username: 'Sistema',
              message: `El juego ha terminado. Ganador: ${winner.username}`,
              timestamp: new Date(),
              isSpectator: false,
              isSystem: true
            });
            rooms.delete(roomId);
          }
        }else if (room.status === 'character_selection') {
          room.status = 'waiting';
        }
        
        // Notificar a todos los clientes en la sala que hubo un cambio
        io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room });
        
        // Sacar al socket de la sala
        socket.leave(roomId);
        
        // Actualizar la lista de salas para todos
        broadcastRoomsList(io, rooms);
        
        return;
      }
      
      // Buscar como espectador
      const spectatorIndex = room.spectators.indexOf(socket.id);
      
      if (spectatorIndex !== -1) {
        // Eliminar al espectador
        room.spectators.splice(spectatorIndex, 1);
        
        // Si era el último en la sala, eliminar la sala
        if (room.players.length === 0 && room.spectators.length === 0) {
          rooms.delete(roomId);
        }
        
        // Notificar a todos los clientes en la sala que hubo un cambio
        io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room });
        
        // Sacar al socket de la sala
        socket.leave(roomId);
        
        // Actualizar la lista de salas para todos
        broadcastRoomsList(io, rooms);
        
        return;
      }
    }
  });

  // Mensajes de chat
}
