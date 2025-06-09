import { Server, Socket } from "socket.io";
import { GameRoom } from "../types/game.types";
import { ServerEvents } from "../types/socket.types";

export function registerDisconnect(io: Server, socket: Socket, rooms: Map<string, GameRoom>) {

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    
    // Buscar todas las salas donde está el jugador o espectador
    for (const [roomId, room] of rooms.entries()) {
      // Buscar como jugador
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        // Obtener username para el mensaje
        const username = room.players[playerIndex].username;
        
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
              reason: 'player_disconnected'
            });
          }
        }
        
        // Notificar a todos los clientes en la sala que hubo un cambio
        io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room });
        
        // Enviar mensaje de chat
        io.to(roomId).emit(ServerEvents.CHAT_MESSAGE, {
          username: 'Sistema',
          message: `${username} se ha desconectado`,
          timestamp: new Date(),
          isSpectator: false
        });
      }
      
      // Buscar como espectador
      const spectatorIndex = room.spectators.indexOf(socket.id);
      
      if (spectatorIndex !== -1) {
        // Eliminar al espectador
        room.spectators.splice(spectatorIndex, 1);
        
        // Si era el último en la sala, eliminar la sala
        if (room.players.length === 0 && room.spectators.length === 0) {
          rooms.delete(roomId);
        } else {
          // Notificar a todos los clientes en la sala que hubo un cambio
          io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room });
          
          // Enviar mensaje de chat
          io.to(roomId).emit(ServerEvents.CHAT_MESSAGE, {
            username: 'Sistema',
            message: `Un espectador se ha desconectado`,
            timestamp: new Date(),
            isSpectator: true
          });
        }
      }
    }
    
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
  });
}
