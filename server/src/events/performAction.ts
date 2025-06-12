import { Server, Socket } from "socket.io";
import config from "../config/config";
import { GameRoom, ActionResult } from "../types/game.types";
import { ClientEvents, ServerEvents, PerformActionData } from "../types/socket.types";
import { broadcastRoomsList, findPlayerRoom } from '../utils/roomHelpers';

export function registerPerformAction(io: Server, socket: Socket, rooms: Map<string, GameRoom>) {

  socket.on(ClientEvents.PERFORM_ACTION, (data: PerformActionData) => {
    // Buscar la sala donde está el jugador
    const found = findPlayerRoom(rooms, socket.id);
    let playerRoom: GameRoom | undefined = found?.room;
    
    if (!playerRoom) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'No estás en ninguna sala', 
        code: 'NOT_IN_ROOM' 
      });
      return;
    }
    
    if (playerRoom.status !== 'in_game') {
      socket.emit(ServerEvents.ERROR, { 
        message: 'El juego no está en curso', 
        code: 'GAME_NOT_IN_PROGRESS' 
      });
      return;
    }
    
    if (!playerRoom.currentTurn || playerRoom.currentTurn.playerId !== socket.id) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'No es tu turno', 
        code: 'NOT_YOUR_TURN' 
      });
      return;
    }
    
    // Validar que los índices son válidos
    const sourcePlayer = playerRoom.players.find(p => p.id === socket.id);
    const targetPlayer = playerRoom.players.find(p => p.id === data.targetPlayerId);
    
    if (!sourcePlayer || !targetPlayer) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'Jugador no encontrado', 
        code: 'PLAYER_NOT_FOUND' 
      });
      return;
    }
    
    if (data.sourceCharacterIndex < 0 || 
        data.sourceCharacterIndex >= sourcePlayer.selectedCharacters.length) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'Índice de personaje de origen inválido', 
        code: 'INVALID_SOURCE_INDEX' 
      });
      return;
    }
    
    if (data.targetCharacterIndex < 0 || 
        data.targetCharacterIndex >= targetPlayer.selectedCharacters.length) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'Índice de personaje objetivo inválido', 
        code: 'INVALID_TARGET_INDEX' 
      });
      return;
    }
    
    if (data.abilityIndex < 0 || 
        data.abilityIndex >= sourcePlayer.selectedCharacters[data.sourceCharacterIndex].abilities.length) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'Índice de habilidad inválido', 
        code: 'INVALID_ABILITY_INDEX' 
      });
      return;
    }
    
    // Verificar que el personaje está vivo
    if (!sourcePlayer.selectedCharacters[data.sourceCharacterIndex].isAlive) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'El personaje de origen está derrotado', 
        code: 'SOURCE_CHARACTER_DEFEATED' 
      });
      return;
    }
    
    if (!targetPlayer.selectedCharacters[data.targetCharacterIndex].isAlive) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'El personaje objetivo está derrotado', 
        code: 'TARGET_CHARACTER_DEFEATED' 
      });
      return;
    }
    
    const sourceCharacter = sourcePlayer.selectedCharacters[data.sourceCharacterIndex];
    const ability = sourceCharacter.abilities[data.abilityIndex];
    
    // Aplicar la habilidad y calcular los efectos
    const targetCharacter = targetPlayer.selectedCharacters[data.targetCharacterIndex];
    const actionResult: ActionResult = {
      playerId: socket.id,
      sourceCharacterIndex: data.sourceCharacterIndex,
      targetPlayerId: data.targetPlayerId,
      targetCharacterIndex: data.targetCharacterIndex,
      ability: ability,
      effects: []
    };
    
    // Aplicar los efectos
    for (const effect of ability.effects) {
      if (effect.target === 'self') {
        // Efecto sobre uno mismo
        if (effect.type === 'buff') {
          if (effect.stat && sourceCharacter.currentStats) {
            const statValue = (sourceCharacter.currentStats[effect.stat] || 0) + effect.value;
            sourceCharacter.currentStats[effect.stat] = statValue;
            
            // Añadir el efecto a los efectos activos
            if (effect.duration && effect.duration > 0) {
              if (!sourceCharacter.activeEffects) {
                sourceCharacter.activeEffects = [];
              }
              
              sourceCharacter.activeEffects.push({
                effect,
                remainingDuration: effect.duration
              });
            }
            
            actionResult.effects.push({
              type: 'buff',
              target: 'source',
              stat: effect.stat,
              value: effect.value,
              duration: effect.duration
            });
          }
        } else if (effect.type === 'heal') {
          const healAmount = effect.value;
          sourceCharacter.currentHealth = Math.min(
            sourceCharacter.currentHealth + healAmount,
            sourceCharacter.stats.health
          );
          
          actionResult.effects.push({
            type: 'heal',
            target: 'source',
            value: healAmount
          });
        } else if (effect.type === 'debuff') {
          if (effect.stat && sourceCharacter.currentStats) {
            const statValue = (sourceCharacter.currentStats[effect.stat] || 0) + effect.value;
            sourceCharacter.currentStats[effect.stat] = statValue;
            
            // Añadir el efecto a los efectos activos
            if (effect.duration && effect.duration > 0) {
              if (!sourceCharacter.activeEffects) {
                sourceCharacter.activeEffects = [];
              }
              
              sourceCharacter.activeEffects.push({
                effect,
                remainingDuration: effect.duration
              });
            }
            
            actionResult.effects.push({
              type: 'debuff',
              target: 'source',
              stat: effect.stat,
              value: effect.value,
              duration: effect.duration
            });
          }
        }
      } else if (effect.target === 'opponent') {
        // Efecto sobre el oponente
        if (effect.type === 'damage') {
          // Comprobar evasión
          const evasionChance = targetCharacter.currentStats?.evasion || 0;
          if (Math.random() < evasionChance / 100) {
            actionResult.effects.push({
              type: 'damage',
              target: 'target',
              value: 0
            });
            io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
              username: 'Sistema',
              message: `${targetPlayer.username} - ${targetCharacter.name} esquivó el ataque`,
              timestamp: new Date(),
              isSpectator: false,
              isSystem: true
            });
            continue;
          }

          const baseDamage = effect.value;
          let damageAmount = baseDamage;
          let attackBonus = 0;

          // Escalar el daño base usando el ataque o ataque especial del atacante
          if (sourceCharacter.currentStats) {
            const isSpecial = ability.category === 'special';
            const attackStat = isSpecial
              ? sourceCharacter.currentStats.specialAttack
              : sourceCharacter.currentStats.attack;
            attackBonus = (attackStat * baseDamage) / 255;
            damageAmount += attackBonus;
          }

          // Calcular defensa según el tipo de habilidad
          let defense = 0;
          let reduction = 0;
          if (targetCharacter.currentStats) {
            const isSpecial = ability.category === 'special';
            defense = isSpecial
              ? targetCharacter.currentStats.specialDefense
              : targetCharacter.currentStats.defense;

            if (effect.ignoreDefense) {
              defense *= 1 - effect.ignoreDefense;
            }

            reduction = damageAmount * (defense / 255);
            damageAmount = Math.max(1, damageAmount - reduction);
          }

          // Comprobar crítico
          const critChance = sourceCharacter.currentStats?.critical || 0;
          const isCrit = Math.random() < critChance / 100;
          if (isCrit) {
            damageAmount *= 2;
          }

          targetCharacter.currentHealth -= damageAmount;

          // Comprobar si el personaje ha sido derrotado
          if (targetCharacter.currentHealth <= 0) {
            targetCharacter.currentHealth = 0;
            targetCharacter.isAlive = false;
            actionResult.isDead = true;
          }

          actionResult.effects.push({
            type: 'damage',
            target: 'target',
            value: damageAmount
          });

          const calcParts = [`Base ${baseDamage}`];
          if (attackBonus) calcParts.push(`+ Atk ${attackBonus.toFixed(2)}`);
          if (reduction) calcParts.push(`- Def ${reduction.toFixed(2)}`);
          if (isCrit) calcParts.push('x2 Crit');
          const calcString = calcParts.join(' ');

          io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
            username: 'Sistema',
            message: `${sourcePlayer.username} - ${sourceCharacter.name} causó ${damageAmount.toFixed(2)} de daño a ${targetPlayer.username} - ${targetCharacter.name}`,
            tooltip: calcString,
            timestamp: new Date(),
            isSpectator: false,
            isSystem: true
          });
        } else if (effect.type === 'debuff') {
          if (effect.stat && targetCharacter.currentStats) {
            const statValue = (targetCharacter.currentStats[effect.stat] || 0) + effect.value;
            targetCharacter.currentStats[effect.stat] = Math.max(1, statValue); // Evitar valores negativos
            
            // Añadir el efecto a los efectos activos
            if (effect.duration && effect.duration > 0) {
              if (!targetCharacter.activeEffects) {
                targetCharacter.activeEffects = [];
              }
              
              targetCharacter.activeEffects.push({
                effect,
                remainingDuration: effect.duration
              });
            }
            
            actionResult.effects.push({
              type: 'debuff',
              target: 'target',
              stat: effect.stat,
              value: effect.value,
              duration: effect.duration
            });
          }
        }
      }
    }
    
    // Registrar la acción en el chat
    io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
      username: 'Sistema',
      message: `${sourcePlayer.username} - ${sourceCharacter.name} usó ${ability.name} sobre ${targetPlayer.username} - ${targetCharacter.name}`,
      timestamp: new Date(),
      isSpectator: false,
      isSystem: true
    });
    
    // Comprobar si el juego ha terminado
    let gameEnded = false;
    for (const player of playerRoom.players) {
      const allDefeated = player.selectedCharacters.every(c => !c.isAlive);
      
      if (allDefeated) {
        gameEnded = true;
        playerRoom.status = 'finished';
        
        // Determinar el ganador (el otro jugador)
        const winner = playerRoom.players.find(p => p.id !== player.id);
        if (winner) {
          playerRoom.winner = winner.id;
          
          // Notificar que el juego ha terminado
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
    
    // Si el juego no ha terminado, calcular el siguiente turno
    if (!gameEnded && playerRoom.turnOrder) {
      // Actualizar el orden de turnos si alguna estadística de velocidad cambió
      // Esto es opcional y depende de si quieres que los cambios de velocidad afecten el orden de turnos
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
      
      // Ordenar nuevamente
      playerRoom.turnOrder.sort((a, b) => b.speed - a.speed);
      
      // Encontrar el índice del turno actual
      const currentTurnIndex = playerRoom.turnOrder.findIndex(
        t => t.playerId === playerRoom.currentTurn?.playerId && 
             t.characterIndex === playerRoom.currentTurn?.characterIndex
      );
      
      // Calcular el siguiente turno
      let nextTurnIndex = (currentTurnIndex + 1) % playerRoom.turnOrder.length;
      let nextTurn = playerRoom.turnOrder[nextTurnIndex];
      
      // Buscar el siguiente personaje vivo
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
      
      // Actualizar el turno actual
      playerRoom.currentTurn = nextTurn;
      

      
      // Actualizar la duración de los efectos activos para todos los personajes
      for (const player of playerRoom.players) {
        for (const character of player.selectedCharacters) {
          if (character.activeEffects) {
            // Procesar los efectos que expiran
            const expiredEffects: number[] = [];
            
            for (let i = 0; i < character.activeEffects.length; i++) {
              const activeEffect = character.activeEffects[i];
              activeEffect.remainingDuration--;
              
              if (activeEffect.remainingDuration <= 0) {
                expiredEffects.push(i);
                
                // Revertir el efecto si es un buff o debuff
                if ((activeEffect.effect.type === 'buff' || activeEffect.effect.type === 'debuff') && 
                    activeEffect.effect.stat && character.currentStats) {
                  character.currentStats[activeEffect.effect.stat] -= activeEffect.effect.value;
                }
              }
            }
            
            // Eliminar los efectos expirados (en orden inverso para no afectar los índices)
            for (let i = expiredEffects.length - 1; i >= 0; i--) {
              character.activeEffects.splice(expiredEffects[i], 1);
            }
          }
        }
      }
      
      // Notificar a todos del resultado de la acción y el siguiente turno
      io.to(playerRoom.id).emit(ServerEvents.ACTION_RESULT, {
        result: actionResult,
        nextTurn: playerRoom.currentTurn
      });
      
      // Notificar el inicio del siguiente turno
      io.to(playerRoom.id).emit(ServerEvents.TURN_STARTED, {
        playerId: nextTurn.playerId,
        characterIndex: nextTurn.characterIndex,
        timeRemaining: config.turnTimeLimit
      });
    } else if (!gameEnded) {
      // Notificar solo del resultado de la acción si el juego ha terminado
      io.to(playerRoom.id).emit(ServerEvents.ACTION_RESULT, {
        result: actionResult
      });
    }
    
    // Si el juego ha terminado, actualizar la lista de salas
    if (gameEnded) {
      broadcastRoomsList(io, rooms);
    }
  });

}
