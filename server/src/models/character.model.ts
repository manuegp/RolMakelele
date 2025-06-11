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
      this.characters = parsedData.characters.map((c: any) => ({
        ...c,
        availableAbilities: c.availableAbilities || c.abilities || [],
        abilities: c.abilities && !c.availableAbilities ? c.abilities : undefined
      }));
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
    const baseAbilities = character.abilities && character.abilities.length > 0
      ? character.abilities
      : character.availableAbilities;
    return {
      ...character,
      abilities: baseAbilities
        .slice(0, config.maxAbilitiesPerCharacter)
        .map(a => ({ ...a })),
      currentHealth: character.stats.health,
      isAlive: true,
      currentStats: { ...character.stats },
      activeEffects: []
    };
  }
}

export default new CharacterService();

