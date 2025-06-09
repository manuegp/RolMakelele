import { Application } from 'express';
import { GameRoom } from '../types/game.types';

export function registerRoomsRoute(app: Application, rooms: Map<string, GameRoom>) {
  app.get('/api/rooms', (req, res) => {
    const roomsList = Array.from(rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      players: room.players.length,
      spectators: room.spectators.length,
      status: room.status
    }));
    res.json({ rooms: roomsList });
  });
}
