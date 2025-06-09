import { Application } from 'express';
import { Character } from '../types/game.types';

export function registerCharactersRoute(app: Application, characters: Character[]) {
  app.get('/api/characters', (req, res) => {
    res.json({ characters });
  });
}
