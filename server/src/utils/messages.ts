import { Server } from 'socket.io';
import { ServerEvents } from '../types/socket.types';

export function sendSystemMessage(
  io: Server,
  roomId: string,
  message: string,
  options: { isSpectator?: boolean; tooltip?: string } = {}
) {
  io.to(roomId).emit(ServerEvents.CHAT_MESSAGE, {
    username: 'Sistema',
    message,
    timestamp: new Date(),
    isSpectator: !!options.isSpectator,
    isSystem: true,
    ...(options.tooltip ? { tooltip: options.tooltip } : {})
  });
}
