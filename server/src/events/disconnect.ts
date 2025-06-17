import { Server, Socket } from "socket.io";
import { GameRoom } from "../types/game.types";
import { ServerEvents } from "../types/socket.types";
import { broadcastRoomsList } from '../utils/roomHelpers';
import { sendSystemMessage } from '../utils/messages';

export function registerDisconnect(
  io: Server,
  socket: Socket,
  rooms: Map<string, GameRoom>,
  disconnectTimers: Map<string, NodeJS.Timeout>
) {

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    
    // Buscar todas las salas donde está el jugador o espectador
    for (const [roomId, room] of rooms.entries()) {
      // Buscar como jugador
      const playerIndex = room.players.findIndex(p => p.id === socket.id);

      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        player.isDisconnected = true;
        player.disconnectedAt = Date.now();

        const key = `${roomId}:${player.username}`;
        const timer = setTimeout(() => {
          const currentRoom = rooms.get(roomId);
          if (!currentRoom) return;
          const currentPlayer = currentRoom.players.find(p => p.username === player.username);
          if (currentPlayer && currentPlayer.isDisconnected) {
            currentRoom.status = 'finished';
            const winner = currentRoom.players.find(p => p.username !== player.username);
            if (winner) {
              currentRoom.winner = winner.id;
              io.to(roomId).emit(ServerEvents.GAME_ENDED, {
                winnerId: winner.id,
                winnerUsername: winner.username,
                reason: 'player_disconnected_timeout'
              });
              sendSystemMessage(
                io,
                roomId,
                `El juego ha terminado. Ganador: ${winner.username}`
              );
              rooms.delete(roomId);
            }
            broadcastRoomsList(io, rooms);
          }
        }, 15000);

        disconnectTimers.set(key, timer);

        io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room });
        sendSystemMessage(io, roomId, `${player.username} se ha desconectado`);
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
          sendSystemMessage(io, roomId, `Un espectador se ha desconectado`, { isSpectator: true });
        }
      }
    }
    
    // Actualizar la lista de salas para todos
    broadcastRoomsList(io, rooms);
  });
}
