import { Character, CharacterState, CharacterType } from '../types/game.types';
import fs from 'fs';
import path from 'path';
import config from '../config/config';

export class CharacterService {
  private characters: Character[] = [];
  private moves: Map<string, any> = new Map();
  private characterTypes: CharacterType[] = [];

  constructor() {
    this.loadCharacters();
  }

  private loadCharacters(): void {
    try {
      const movesRaw = fs.readFileSync(
        path.resolve(process.cwd(), config.movesDataPath),
        'utf-8'
      );
      const parsedMoves = JSON.parse(movesRaw).moves;
      this.moves = new Map(parsedMoves.map((m: any) => [m.id, m]));

      const typesRaw = fs.readFileSync(
        path.resolve(process.cwd(), config.characterTypesDataPath),
        'utf-8'
      );
      this.characterTypes = JSON.parse(typesRaw);

      const charactersData = fs.readFileSync(
        path.resolve(process.cwd(), config.charactersDataPath),
        'utf-8'
      );
      const parsedData = JSON.parse(charactersData);
      this.characters = parsedData.characters.map((c: any) => ({
        ...c,
        types: (c.types || [])
          .map((name: string) =>
            this.characterTypes.find(t => t.name === name)
          )
          .filter(Boolean),
        availableAbilities: (c.availableAbilities || [])
          .map((id: string) => this.moves.get(id))
          .filter(Boolean),
        abilities: c.abilities
          ? c.abilities.map((id: string) => this.moves.get(id)).filter(Boolean)
          : []
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

  getMoveById(id: string): any | undefined {
    return this.moves.get(id);
  }

  characterToCharacterState(character: Character): CharacterState {
    const baseAbilities =
      character.abilities.length > 0
        ? character.abilities
        : character.availableAbilities;
    return {
      ...character,
      abilities: baseAbilities
        .slice(0, config.maxAbilitiesPerCharacter)
        .map(a => ({ ...a })),
      currentHealth: character.stats.health,
      isAlive: true,
      statStages: {
        speed: 0,
        health: 0,
        attack: 0,
        defense: 0,
        specialAttack: 0,
        specialDefense: 0,
        critical: 0,
        evasion: 0
      },
      currentStats: { ...character.stats },
      activeEffects: [],
      status: undefined,
      statusTurns: 0
    };
  }
}

export default new CharacterService();

