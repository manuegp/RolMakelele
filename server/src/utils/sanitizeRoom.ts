import { GameRoom } from '../types/game.types';

export function sanitizeRoom(room: GameRoom): GameRoom {
  const sanitizedPlayers = room.players.map(({ reconnectTimer, ...player }) => ({
    ...player
  }));
  return { ...room, players: sanitizedPlayers };
}
