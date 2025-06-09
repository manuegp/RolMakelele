import { Application } from 'express';
import { GameRoom } from '../types/game.types';
import { getRoomsListData } from '../utils/roomHelpers';

export function registerRoomsRoute(app: Application, rooms: Map<string, GameRoom>) {
  app.get('/api/rooms', (req, res) => {
    res.json(getRoomsListData(rooms));
  });
}
