import { Character, CharacterState } from '../types/game.types';
import fs from 'fs';
import path from 'path';
import config from '../config/config';

export class CharacterService {
  private characters: Character[] = [];

  constructor() {
    this.loadCharacters();
  }

  private loadCharacters(): void {
    try {
      const charactersData = fs.readFileSync(
        path.resolve(process.cwd(), config.charactersDataPath),
        'utf-8'
      );
      const parsedData = JSON.parse(charactersData);
      this.characters = parsedData.characters;
      console.log(`Cargados ${this.characters.length} personajes`);
    } catch (error) {
      console.error('Error al cargar los personajes:', error);
      this.characters = [];
    }
  }

  getAllCharacters(): Character[] {
    return this.characters;
  }

  getCharacterById(id: string): Character | undefined {
    return this.characters.find(character => character.id === id);
  }

  characterToCharacterState(character: Character): CharacterState {
    return {
      ...character,
      currentHealth: character.stats.health,
      isAlive: true,
      currentStats: { ...character.stats },
      activeEffects: [],
      abilities: character.abilities.map(ability => ({
        ...ability
      }))
    };
  }
}

export default new CharacterService();

