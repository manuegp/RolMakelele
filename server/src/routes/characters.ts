import { Application } from 'express';
import { Character } from '../types/game.types';

export function registerCharactersRoute(app: Application, characters: Character[]) {
  app.get('/api/characters', (req, res) => {
    res.json({ characters });
  });

  app.get('/api/characters/:id/abilities', (req, res) => {
    const char = characters.find(c => c.id === req.params.id);
    if (!char) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }
    res.json({ abilities: char.availableAbilities });
  });
}
