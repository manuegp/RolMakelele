import { Server, Socket } from "socket.io";
import { GameRoom } from "../types/game.types";
import { ServerEvents } from "../types/socket.types";
import config from "../config/config";
import { sanitizeRoom } from "../utils/sanitizeRoom";

export function registerDisconnect(io: Server, socket: Socket, rooms: Map<string, GameRoom>) {

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    
    // Buscar todas las salas donde está el jugador o espectador
    for (const [roomId, room] of rooms.entries()) {
      // Buscar como jugador
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        const username = player.username;

        // Marcar como desconectado y esperar reconexion
        player.connected = false;
        player.reconnectTimer = setTimeout(() => {
          if (!player.connected) {
            room.players.splice(playerIndex, 1);

            if (room.players.length === 0 && room.spectators.length === 0) {
              rooms.delete(roomId);
            } else if (room.status === 'in_game') {
              room.status = 'finished';
              const winner = room.players[0];
              if (winner) {
                room.winner = winner.id;
                io.to(roomId).emit(ServerEvents.GAME_ENDED, {
                  winnerId: winner.id,
                  winnerUsername: winner.username,
                  reason: 'player_disconnected'
                });
              }
            }

            io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room: sanitizeRoom(room) });
          }
        }, config.reconnectTimeout * 1000);

        io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room: sanitizeRoom(room) });
        
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
          io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room: sanitizeRoom(room) });
          
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
