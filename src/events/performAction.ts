import { Server, Socket } from "socket.io";
import config from "../config/config";
import { GameRoom, ActionResult } from "../types/game.types";
import { ClientEvents, ServerEvents, PerformActionData } from "../types/socket.types";

export function registerPerformAction(io: Server, socket: Socket, rooms: Map<string, GameRoom>) {

  socket.on(ClientEvents.PERFORM_ACTION, (data: PerformActionData) => {
    // Buscar la sala donde está el jugador
    let playerRoom: GameRoom | undefined;
    
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        playerRoom = room;
        break;
      }
    }
    
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
    
    // Verificar que la habilidad no está en cooldown
    const sourceCharacter = sourcePlayer.selectedCharacters[data.sourceCharacterIndex];
    const ability = sourceCharacter.abilities[data.abilityIndex];
    
    if (ability.currentCooldown && ability.currentCooldown > 0) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'La habilidad está en enfriamiento', 
        code: 'ABILITY_ON_COOLDOWN' 
      });
      return;
    }
    
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
          let damageAmount = effect.value;
          
          // Calcular defensa
          if (targetCharacter.currentStats) {
            const defense = targetCharacter.currentStats.defense;
            let damageReduction = defense * 0.1; // 10% de reducción por punto de defensa
            
            // Si hay ignoreDefense, reducir la cantidad de defensa efectiva
            if (effect.ignoreDefense) {
              damageReduction *= (1 - effect.ignoreDefense);
            }
            
            damageAmount = Math.max(1, damageAmount - damageReduction);
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
    
    // Establecer el cooldown de la habilidad
    ability.currentCooldown = ability.cooldown;
    
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
      
      // Actualizar cooldowns de las habilidades del personaje que acaba de jugar
      for (const ability of sourceCharacter.abilities) {
        if (ability.currentCooldown && ability.currentCooldown > 0) {
          ability.currentCooldown--;
        }
      }
      
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
      io.emit(ServerEvents.ROOMS_LIST, { 
        rooms: Array.from(rooms.values()).map(r => ({
          id: r.id,
          name: r.name,
          players: r.players.length,
          spectators: r.spectators.length,
          status: r.status
        }))
      });
    }
  });

}
