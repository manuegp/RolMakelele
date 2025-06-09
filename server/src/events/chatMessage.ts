import { Server, Socket } from "socket.io";
import { GameRoom } from "../types/game.types";
import { ClientEvents, ServerEvents, ChatMessageData } from "../types/socket.types";

export function registerChatMessage(io: Server, socket: Socket, rooms: Map<string, GameRoom>) {

  socket.on(ClientEvents.CHAT_MESSAGE, (data: ChatMessageData) => {
    // Buscar la sala donde está el jugador o espectador
    let roomId: string | undefined;
    let isSpectator = false;
    let username = 'Anónimo';
    
    for (const [id, room] of rooms.entries()) {
      // Buscar como jugador
      const player = room.players.find(p => p.id === socket.id);
      
      if (player) {
        roomId = id;
        username = player.username;
        break;
      }
      
      // Buscar como espectador
      const spectatorIndex = room.spectators.indexOf(socket.id);
      
      if (spectatorIndex !== -1) {
        roomId = id;
        isSpectator = true;
        break;
      }
    }
    
    if (!roomId) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'No estás en ninguna sala', 
        code: 'NOT_IN_ROOM' 
      });
      return;
    }
    
    // Enviar el mensaje a todos en la sala
    io.to(roomId).emit(ServerEvents.CHAT_MESSAGE, {
      username,
      message: data.message,
      timestamp: new Date(),
      isSpectator
    });
  });

  // Desconexión
  socket.on('disconnect', () => {
})}
