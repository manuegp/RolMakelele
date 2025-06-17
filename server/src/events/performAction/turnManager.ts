import { Server } from "socket.io";
import config from "../../config/config";
import { GameRoom, ActionResult } from "../../types/game.types";
import { ServerEvents } from "../../types/socket.types";
import { updateStatStage, removeStatus } from "./utils/effects";
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

    const activePlayer = playerRoom.players.find(p => p.id === nextTurn.playerId);
    const activeChar = activePlayer?.selectedCharacters[nextTurn.characterIndex];
    let skipTurn = false;
    const startEffects: ActionResult['effects'] = [];
    if (activeChar && activeChar.status) {
      activeChar.statusTurns = (activeChar.statusTurns || 0) + 1;
      if (activeChar.status === 'burn') {
        const dmg = activeChar.stats.health * 0.125;
        activeChar.currentHealth = Math.max(0, activeChar.currentHealth - dmg);
        if (activeChar.currentHealth === 0) activeChar.isAlive = false;
        startEffects.push({ type: 'damage', target: 'source', value: dmg });
        io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
          username: 'Sistema',
          message: `${activePlayer?.username} - ${activeChar.name} sufre ${dmg.toFixed(2)} de daño por quemadura`,
          timestamp: new Date(),
          isSpectator: false,
          isSystem: true
        });
      } else if (activeChar.status === 'paralysis') {
        if (Math.random() < 0.25) {
          skipTurn = true;
          io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
            username: 'Sistema',
            message: `${activePlayer?.username} - ${activeChar.name} está paralizado y pierde el turno`,
            timestamp: new Date(),
            isSpectator: false,
            isSystem: true
          });
        }
      } else if (activeChar.status === 'drunk') {
        const selfHit = Math.random() < 1 / 3;
        if (selfHit) {
          const dmg = activeChar.stats.health * 0.0625;
          activeChar.currentHealth = Math.max(0, activeChar.currentHealth - dmg);
          if (activeChar.currentHealth === 0) activeChar.isAlive = false;
          startEffects.push({ type: 'damage', target: 'source', value: dmg });
          io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
            username: 'Sistema',
            message: `${activePlayer?.username} - ${activeChar.name} se golpeó a sí mismo y perdió ${dmg.toFixed(2)} de vida`,
            timestamp: new Date(),
            isSpectator: false,
            isSystem: true
          });
        }
        skipTurn = true;
      } else if (activeChar.status === 'sleep') {
        let chance = 0;
        if (activeChar.statusTurns === 1) chance = 0.3333;
        else if (activeChar.statusTurns === 2) chance = 0.6666;
        else if (activeChar.statusTurns === 3) chance = 0.9999;
        else if (activeChar.statusTurns >= 4) chance = 1;
        if (Math.random() < chance) {
          removeStatus(activeChar, startEffects, 'source');
          io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
            username: 'Sistema',
            message: `${activePlayer?.username} - ${activeChar.name} se despertó`,
            timestamp: new Date(),
            isSpectator: false,
            isSystem: true
          });
        } else {
          skipTurn = true;
          io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
            username: 'Sistema',
            message: `${activePlayer?.username} - ${activeChar.name} está dormido`,
            timestamp: new Date(),
            isSpectator: false,
            isSystem: true
          });
        }
      }
    }


    if (skipTurn) {
      const skipResult: ActionResult = {
        playerId: nextTurn.playerId,
        sourceCharacterIndex: nextTurn.characterIndex,
        targetPlayerId: nextTurn.playerId,
        targetCharacterIndex: nextTurn.characterIndex,
        ability: { id: 'skip', name: 'Skip', description: 'Turno perdido', category: 'status', effects: [] },
        effects: []
      };
      processTurn(io, rooms, playerRoom, skipResult);
      return;
    }

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
      timeRemaining: config.turnTimeLimit,
      effects: startEffects
    });
  } else if (!gameEnded) {
    io.to(playerRoom.id).emit(ServerEvents.ACTION_RESULT, { result: actionResult });
  }

  if (gameEnded) {
    broadcastRoomsList(io, rooms);
  }
}

