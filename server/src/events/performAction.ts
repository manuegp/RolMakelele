import { Server, Socket } from "socket.io";
import { GameRoom, ActionResult } from "../types/game.types";
import { ClientEvents, ServerEvents, PerformActionData } from "../types/socket.types";
import { validateAction } from './performAction/validation';
import { applyAbilityEffects } from './performAction/effects';
import { processTurn } from './performAction/turnManager';
import { sendSystemMessage } from '../utils/messages';

export function registerPerformAction(io: Server, socket: Socket, rooms: Map<string, GameRoom>) {

  socket.on(ClientEvents.PERFORM_ACTION, (data: PerformActionData) => {
    const context = validateAction(io, socket, rooms, data);
    if (!context) return;

    const {
      playerRoom,
      sourcePlayer,
      targetPlayer,
      sourceCharacter,
      targetCharacter,
      ability
    } = context;
    
    const actionResult: ActionResult = {
      playerId: socket.id,
      sourceCharacterIndex: data.sourceCharacterIndex,
      targetPlayerId: data.targetPlayerId,
      targetCharacterIndex: data.targetCharacterIndex,
      ability,
      effects: []
    };

    applyAbilityEffects(
      io,
      playerRoom,
      sourcePlayer,
      targetPlayer,
      sourceCharacter,
      targetCharacter,
      ability,
      actionResult
    );

    sendSystemMessage(
      io,
      playerRoom.id,
      `${sourcePlayer.username} - ${sourceCharacter.name} usó ${ability.name} sobre ${targetPlayer.username} - ${targetCharacter.name}`
    );

    processTurn(io, rooms, playerRoom, actionResult);
  });

}
