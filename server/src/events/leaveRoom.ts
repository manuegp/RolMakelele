import { Server, Socket } from "socket.io";
import { GameRoom } from "../types/game.types";
import { ClientEvents, ServerEvents } from "../types/socket.types";

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
        } else {
          // Reiniciar la sala para una nueva partida
          room.status = 'waiting';
          room.turnOrder = undefined;
          room.currentTurn = undefined;
          room.winner = undefined;
          for (const p of room.players) {
            p.selectedCharacters = [];
            p.isReady = false;
          }
        }
        
        // Notificar a todos los clientes en la sala que hubo un cambio
        io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room });
        
        // Sacar al socket de la sala
        socket.leave(roomId);
        
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
        io.emit(ServerEvents.ROOMS_LIST, { 
          rooms: Array.from(rooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            players: r.players.length,
            spectators: r.spectators.length,
            status: r.status
          }))
        });
        
        return;
      }
    }
  });

  // Mensajes de chat
}
