import { Server } from "socket.io";
import config from "../../config/config";
import { GameRoom, ActionResult } from "../../types/game.types";
import { ServerEvents } from "../../types/socket.types";
import { updateStatStage } from "./utils/effects";
import { broadcastRoomsList } from '../../utils/roomHelpers';

export function processTurn(
  io: Server,
  rooms: Map<string, GameRoom>,
  playerRoom: GameRoom,
  actionResult: ActionResult
) {
  let gameEnded = false;
  for (const player of playerRoom.players) {
    const allDefeated = player.selectedCharacters.every(c => !c.isAlive);
    if (allDefeated) {
      gameEnded = true;
      playerRoom.status = 'finished';
      const winner = playerRoom.players.find(p => p.id !== player.id);
      if (winner) {
        playerRoom.winner = winner.id;
        io.to(playerRoom.id).emit(ServerEvents.GAME_ENDED, {
          winnerId: winner.id,
          winnerUsername: winner.username
        });
        io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
          username: 'Sistema',
          message: `El juego ha terminado. Ganador: ${winner.username}`,
          timestamp: new Date(),
          isSpectator: false,
          isSystem: true
        });
      }
      break;
    }
  }

  if (!gameEnded && playerRoom.turnOrder) {
    for (let i = 0; i < playerRoom.turnOrder.length; i++) {
      const order = playerRoom.turnOrder[i];
      const player = playerRoom.players.find(p => p.id === order.playerId);
      if (player) {
        const character = player.selectedCharacters[order.characterIndex];
        if (character.currentStats) {
          playerRoom.turnOrder[i].speed = character.currentStats.speed;
        }
      }
    }

    playerRoom.turnOrder.sort((a, b) => b.speed - a.speed);
    const currentTurnIndex = playerRoom.turnOrder.findIndex(
      t => t.playerId === playerRoom.currentTurn?.playerId &&
           t.characterIndex === playerRoom.currentTurn?.characterIndex
    );
    let nextTurnIndex = (currentTurnIndex + 1) % playerRoom.turnOrder.length;
    let nextTurn = playerRoom.turnOrder[nextTurnIndex];
    let safetyCounter = playerRoom.turnOrder.length;
    while (safetyCounter > 0) {
      const nextPlayer = playerRoom.players.find(p => p.id === nextTurn.playerId);
      if (nextPlayer && nextPlayer.selectedCharacters[nextTurn.characterIndex].isAlive) {
        break;
      }
      nextTurnIndex = (nextTurnIndex + 1) % playerRoom.turnOrder.length;
      nextTurn = playerRoom.turnOrder[nextTurnIndex];
      safetyCounter--;
    }

    playerRoom.currentTurn = nextTurn;

    for (const player of playerRoom.players) {
      for (const character of player.selectedCharacters) {
        if (character.activeEffects) {
          const expiredEffects: number[] = [];
          for (let i = 0; i < character.activeEffects.length; i++) {
            const activeEffect = character.activeEffects[i];
            activeEffect.remainingDuration--;
            if (activeEffect.remainingDuration <= 0) {
              expiredEffects.push(i);
              if ((activeEffect.effect.type === 'buff' || activeEffect.effect.type === 'debuff') &&
                  activeEffect.effect.stat) {
                updateStatStage(character, activeEffect.effect.stat, -activeEffect.effect.value);
              }
            }
          }
          for (let i = expiredEffects.length - 1; i >= 0; i--) {
            character.activeEffects.splice(expiredEffects[i], 1);
          }
        }
      }
    }

    io.to(playerRoom.id).emit(ServerEvents.ACTION_RESULT, {
      result: actionResult,
      nextTurn: playerRoom.currentTurn
    });

    io.to(playerRoom.id).emit(ServerEvents.TURN_STARTED, {
      playerId: nextTurn.playerId,
      characterIndex: nextTurn.characterIndex,
      timeRemaining: config.turnTimeLimit
    });
  } else if (!gameEnded) {
    io.to(playerRoom.id).emit(ServerEvents.ACTION_RESULT, { result: actionResult });
  }

  if (gameEnded) {
    broadcastRoomsList(io, rooms);
  }
}

