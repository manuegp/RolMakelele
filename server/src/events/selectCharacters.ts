import { Server, Socket } from 'socket.io';
import config from '../config/config';
import characterService from '../models/character.model';
import { GameRoom, Player, CharacterState } from '../types/game.types';
import {
  ClientEvents,
  ServerEvents,
  SelectCharactersData
} from '../types/socket.types';
import { findPlayerRoom } from '../utils/roomHelpers';

export function registerSelectCharacters(
  io: Server,
  socket: Socket,
  rooms: Map<string, GameRoom>
) {
  socket.on(ClientEvents.SELECT_CHARACTERS, (data: SelectCharactersData) => {
    const found = findPlayerRoom(rooms, socket.id);
    let playerRoom: GameRoom | undefined = found?.room;
    let player: Player | undefined = found?.player;

    if (!playerRoom || !player) {
      socket.emit(ServerEvents.ERROR, {
        message: 'No estás en ninguna sala',
        code: 'NOT_IN_ROOM'
      });
      return;
    }

    if (playerRoom.status !== 'waiting' && playerRoom.status !== 'character_selection') {
      socket.emit(ServerEvents.ERROR, {
        message: 'No puedes seleccionar personajes en este momento',
        code: 'INVALID_GAME_STATE'
      });
      return;
    }

    if (data.characters.length !== config.maxCharactersPerPlayer) {
      socket.emit(ServerEvents.ERROR, {
        message: `Debes seleccionar exactamente ${config.maxCharactersPerPlayer} personajes`,
        code: 'INVALID_CHARACTER_COUNT'
      });
      return;
    }

    const selectedCharacters: CharacterState[] = [];
    for (const entry of data.characters) {
      const character = characterService.getCharacterById(entry.id);
      if (!character) {
        socket.emit(ServerEvents.ERROR, {
          message: `Personaje con ID ${entry.id} no encontrado`,
          code: 'CHARACTER_NOT_FOUND'
        });
        return;
      }
      if (entry.abilityIds.length > config.maxAbilitiesPerCharacter) {
        socket.emit(ServerEvents.ERROR, {
          message: 'Número de habilidades inválido',
          code: 'INVALID_ABILITIES_COUNT'
        });
        return;
      }

      const availableIds = new Set(character.availableAbilities.map(a => a.id));
      const abilityObjects = entry.abilityIds
        .filter(id => availableIds.has(id))
        .map(id => characterService.getMoveById(id)!)
        .slice(0, config.maxAbilitiesPerCharacter);
      const customized = { ...character, abilities: abilityObjects };
      selectedCharacters.push(characterService.characterToCharacterState(customized));
    }

    const playerIndex = playerRoom.players.findIndex(p => p.id === socket.id);
    playerRoom.players[playerIndex].selectedCharacters = selectedCharacters;

    if (playerRoom.status === 'waiting') {
      playerRoom.status = 'character_selection';
    }

    io.to(playerRoom.id).emit(ServerEvents.ROOM_UPDATED, { room: playerRoom });
  });
}
