import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';


import { createRoomHandler } from './events/createRoom';

import config from './config/config';
import { 
  GameRoom, Player, Character, CharacterState, 
  GameAction, ActionResult, RoomStatus
} from './types/game.types';
import { 
  ClientEvents, ServerEvents, 
  JoinRoomData, CreateRoomData, SelectCharactersData, 
  PerformActionData, ChatMessageData
} from './types/socket.types';

// Inicializa la aplicación Express
const app = express();
app.use(cors({
  origin: config.corsOrigin
}));
app.use(express.json());

// Crea el servidor HTTP y Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
});

// Estado global del juego
const rooms: Map<string, GameRoom> = new Map();
let characters: Character[] = [];

// Cargar personajes desde el archivo JSON
try {
  const charactersData = fs.readFileSync(
    path.resolve(process.cwd(), config.charactersDataPath),
    'utf-8'
  );
  const parsedData = JSON.parse(charactersData);
  characters = parsedData.characters;
  console.log(`Cargados ${characters.length} personajes`);
} catch (error) {
  console.error('Error al cargar los personajes:', error);
  process.exit(1);
}

// Rutas API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/characters', (req, res) => {
  res.json({ characters });
});

app.get('/api/rooms', (req, res) => {
  const roomsList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    players: room.players.length,
    spectators: room.spectators.length,
    status: room.status
  }));
  res.json({ rooms: roomsList });
});

// Función para convertir un personaje a su estado en juego
function characterToCharacterState(character: Character): CharacterState {
  return {
    ...character,
    currentHealth: character.stats.health,
    isAlive: true,
    currentStats: { ...character.stats },
    activeEffects: [],
    abilities: character.abilities.map(ability => ({
      ...ability,
      currentCooldown: 0
    }))
  };
}

// Lógica de Socket.IO
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  
  // Enviar lista de personajes al cliente cuando se conecta
  socket.emit(ServerEvents.CHARACTERS_LIST, { characters });
  
  // Enviar lista de salas al cliente cuando se conecta
  const roomsList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    players: room.players.length,
    spectators: room.spectators.length,
    status: room.status
  }));
  socket.emit(ServerEvents.ROOMS_LIST, { rooms: roomsList });

  // Crear una sala
  socket.on(
    ClientEvents.CREATE_ROOM,
    createRoomHandler(io, rooms)(socket)
  );

  // Unirse a una sala
  socket.on(ClientEvents.JOIN_ROOM, (data: JoinRoomData) => {
    const room = rooms.get(data.roomId);
    
    if (!room) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'La sala no existe', 
        code: 'ROOM_NOT_FOUND' 
      });
      return;
    }
    
    if (room.status !== 'waiting') {
      socket.emit(ServerEvents.ERROR, { 
        message: 'No puedes unirte a una partida en curso', 
        code: 'GAME_IN_PROGRESS' 
      });
      return;
    }
    
    if (room.players.length >= room.maxPlayers) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'La sala está llena', 
        code: 'ROOM_FULL' 
      });
      return;
    }
    
    // Añadir al jugador a la sala
    const player: Player = {
      id: socket.id,
      username: data.username,
      selectedCharacters: [],
      isReady: false
    };
    
    room.players.push(player);
    
    // Unir al socket a la sala
    socket.join(data.roomId);
    
    // Notificar al cliente que se unió correctamente
    socket.emit(ServerEvents.ROOM_JOINED, { room });
    
    // Notificar a todos los clientes en la sala que hubo un cambio
    io.to(data.roomId).emit(ServerEvents.ROOM_UPDATED, { room });
    
    // Actualizar la lista de salas para todos
    io.emit(ServerEvents.ROOMS_LIST, { 
      rooms: Array.from(rooms.values()).map(r => ({
        id: r.id,
        name: r.name,
        players: r.players.length,
        spectators: r.spectators.length,
        status: r.status
      }))
    });
  });

  // Unirse como espectador
  socket.on(ClientEvents.JOIN_AS_SPECTATOR, (data: JoinRoomData) => {
    const room = rooms.get(data.roomId);
    
    if (!room) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'La sala no existe', 
        code: 'ROOM_NOT_FOUND' 
      });
      return;
    }
    
    if (room.spectators.length >= room.maxSpectators) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'No hay más espacio para espectadores', 
        code: 'SPECTATORS_FULL' 
      });
      return;
    }
    
    // Añadir al espectador
    room.spectators.push(socket.id);
    
    // Unir al socket a la sala
    socket.join(data.roomId);
    
    // Notificar al cliente que se unió correctamente
    socket.emit(ServerEvents.ROOM_JOINED, { room });
    
    // Notificar a todos los clientes en la sala que hubo un cambio
    io.to(data.roomId).emit(ServerEvents.ROOM_UPDATED, { room });
    
    // Enviar mensaje de chat
    io.to(data.roomId).emit(ServerEvents.CHAT_MESSAGE, {
      username: 'Sistema',
      message: `${data.username} se ha unido como espectador`,
      timestamp: new Date(),
      isSpectator: true
    });
  });

  // Seleccionar personajes
  socket.on(ClientEvents.SELECT_CHARACTERS, (data: SelectCharactersData) => {
    // Buscar la sala donde está el jugador
    let playerRoom: GameRoom | undefined;
    let player: Player | undefined;
    
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        playerRoom = room;
        player = room.players[playerIndex];
        break;
      }
    }
    
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
    
    if (data.characterIds.length !== config.maxCharactersPerPlayer) {
      socket.emit(ServerEvents.ERROR, { 
        message: `Debes seleccionar exactamente ${config.maxCharactersPerPlayer} personajes`, 
        code: 'INVALID_CHARACTER_COUNT' 
      });
      return;
    }
    
    // Verificar que los IDs de los personajes son válidos
    const selectedCharacters: CharacterState[] = [];
    
    for (const charId of data.characterIds) {
      const character = characters.find(c => c.id === charId);
      
      if (!character) {
        socket.emit(ServerEvents.ERROR, { 
          message: `Personaje con ID ${charId} no encontrado`, 
          code: 'CHARACTER_NOT_FOUND' 
        });
        return;
      }
      
      selectedCharacters.push(characterToCharacterState(character));
    }
    
    // Actualizar los personajes seleccionados del jugador
    const playerIndex = playerRoom.players.findIndex(p => p.id === socket.id);
    playerRoom.players[playerIndex].selectedCharacters = selectedCharacters;
    
    if (playerRoom.status === 'waiting') {
      playerRoom.status = 'character_selection';
    }
    
    // Notificar a todos los clientes en la sala que hubo un cambio
    io.to(playerRoom.id).emit(ServerEvents.ROOM_UPDATED, { room: playerRoom });
  });

  // Marcar como listo
  socket.on(ClientEvents.READY, () => {
    // Buscar la sala donde está el jugador
    let playerRoom: GameRoom | undefined;
    let player: Player | undefined;
    
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        playerRoom = room;
        player = room.players[playerIndex];
        break;
      }
    }
    
    if (!playerRoom || !player) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'No estás en ninguna sala', 
        code: 'NOT_IN_ROOM' 
      });
      return;
    }
    
    if (playerRoom.status !== 'character_selection') {
      socket.emit(ServerEvents.ERROR, { 
        message: 'No puedes marcar como listo en este momento', 
        code: 'INVALID_GAME_STATE' 
      });
      return;
    }
    
    if (player.selectedCharacters.length !== config.maxCharactersPerPlayer) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'Debes seleccionar personajes antes de marcar como listo', 
        code: 'CHARACTERS_NOT_SELECTED' 
      });
      return;
    }
    
    // Marcar al jugador como listo
    const playerIndex = playerRoom.players.findIndex(p => p.id === socket.id);
    playerRoom.players[playerIndex].isReady = true;
    
    // Comprobar si todos los jugadores están listos
    const allPlayersReady = playerRoom.players.length === config.maxPlayersPerRoom && 
                          playerRoom.players.every(p => p.isReady);
    
    if (allPlayersReady) {
      // Iniciar el juego
      playerRoom.status = 'in_game';
      
      // Calcular el orden de los turnos basado en la velocidad
      const turnOrder: {
        playerId: string;
        characterIndex: number;
        speed: number;
      }[] = [];
      
      for (const player of playerRoom.players) {
        for (let i = 0; i < player.selectedCharacters.length; i++) {
          turnOrder.push({
            playerId: player.id,
            characterIndex: i,
            speed: player.selectedCharacters[i].currentStats?.speed || 
                   player.selectedCharacters[i].stats.speed
          });
        }
      }
      
      // Ordenar por velocidad (de mayor a menor)
      turnOrder.sort((a, b) => b.speed - a.speed);
      
      playerRoom.turnOrder = turnOrder;
      playerRoom.currentTurn = turnOrder[0];
      
      // Notificar a todos que el juego ha comenzado
      io.to(playerRoom.id).emit(ServerEvents.GAME_STARTED, {
        room: playerRoom,
        turnOrder
      });
      
      // Notificar el primer turno
      io.to(playerRoom.id).emit(ServerEvents.TURN_STARTED, {
        playerId: turnOrder[0].playerId,
        characterIndex: turnOrder[0].characterIndex,
        timeRemaining: config.turnTimeLimit
      });
      
      // Actualizar la lista de salas para todos
      io.emit(ServerEvents.ROOMS_LIST, { 
        rooms: Array.from(rooms.values()).map(r => ({
          id: r.id,
          name: r.name,
          players: r.players.length,
          spectators: r.spectators.length,
          status: r.status
        }))
      });
    } else {
      // Notificar a todos los clientes en la sala que hubo un cambio
      io.to(playerRoom.id).emit(ServerEvents.ROOM_UPDATED, { room: playerRoom });
    }
  });

  // Realizar una acción
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

  // Abandonar sala
  socket.on(ClientEvents.LEAVE_ROOM, () => {
    // Buscar todas las salas donde está el jugador o espectador
    for (const [roomId, room] of rooms.entries()) {
      // Buscar como jugador
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        // Eliminar al jugador
        room.players.splice(playerIndex, 1);
        
        // Si era el último jugador, eliminar la sala
        if (room.players.length === 0 && room.spectators.length === 0) {
          rooms.delete(roomId);
        } else if (room.status === 'in_game') {
          // Si el juego estaba en curso, el otro jugador gana automáticamente
          room.status = 'finished';
          
          // Determinar el ganador (el otro jugador)
          const winner = room.players[0];
          if (winner) {
            room.winner = winner.id;
            
            // Notificar que el juego ha terminado
            io.to(roomId).emit(ServerEvents.GAME_ENDED, {
              winnerId: winner.id,
              winnerUsername: winner.username
            });
          }
        }
        
        // Notificar a todos los clientes en la sala que hubo un cambio
        io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room });
        
        // Sacar al socket de la sala
        socket.leave(roomId);
        
        // Actualizar la lista de salas para todos
        io.emit(ServerEvents.ROOMS_LIST, { 
          rooms: Array.from(rooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            players: r.players.length,
            spectators: r.spectators.length,
            status: r.status
          }))
        });
        
        return;
      }
      
      // Buscar como espectador
      const spectatorIndex = room.spectators.indexOf(socket.id);
      
      if (spectatorIndex !== -1) {
        // Eliminar al espectador
        room.spectators.splice(spectatorIndex, 1);
        
        // Si era el último en la sala, eliminar la sala
        if (room.players.length === 0 && room.spectators.length === 0) {
          rooms.delete(roomId);
        }
        
        // Notificar a todos los clientes en la sala que hubo un cambio
        io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room });
        
        // Sacar al socket de la sala
        socket.leave(roomId);
        
        // Actualizar la lista de salas para todos
        io.emit(ServerEvents.ROOMS_LIST, { 
          rooms: Array.from(rooms.values()).map(r => ({
            id: r.id,
            name: r.name,
            players: r.players.length,
            spectators: r.spectators.length,
            status: r.status
          }))
        });
        
        return;
      }
    }
  });

  // Mensajes de chat
  socket.on(ClientEvents.CHAT_MESSAGE, (data: ChatMessageData) => {
    // Buscar la sala donde está el jugador o espectador
    let roomId: string | undefined;
    let isSpectator = false;
    let username = 'Anónimo';
    
    for (const [id, room] of rooms.entries()) {
      // Buscar como jugador
      const player = room.players.find(p => p.id === socket.id);
      
      if (player) {
        roomId = id;
        username = player.username;
        break;
      }
      
      // Buscar como espectador
      const spectatorIndex = room.spectators.indexOf(socket.id);
      
      if (spectatorIndex !== -1) {
        roomId = id;
        isSpectator = true;
        break;
      }
    }
    
    if (!roomId) {
      socket.emit(ServerEvents.ERROR, { 
        message: 'No estás en ninguna sala', 
        code: 'NOT_IN_ROOM' 
      });
      return;
    }
    
    // Enviar el mensaje a todos en la sala
    io.to(roomId).emit(ServerEvents.CHAT_MESSAGE, {
      username,
      message: data.message,
      timestamp: new Date(),
      isSpectator
    });
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    
    // Buscar todas las salas donde está el jugador o espectador
    for (const [roomId, room] of rooms.entries()) {
      // Buscar como jugador
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        // Obtener username para el mensaje
        const username = room.players[playerIndex].username;
        
        // Eliminar al jugador
        room.players.splice(playerIndex, 1);
        
        // Si era el último jugador, eliminar la sala
        if (room.players.length === 0 && room.spectators.length === 0) {
          rooms.delete(roomId);
        } else if (room.status === 'in_game') {
          // Si el juego estaba en curso, el otro jugador gana automáticamente
          room.status = 'finished';
          
          // Determinar el ganador (el otro jugador)
          const winner = room.players[0];
          if (winner) {
            room.winner = winner.id;
            
            // Notificar que el juego ha terminado
            io.to(roomId).emit(ServerEvents.GAME_ENDED, {
              winnerId: winner.id,
              winnerUsername: winner.username
            });
          }
        }
        
        // Notificar a todos los clientes en la sala que hubo un cambio
        io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room });
        
        // Enviar mensaje de chat
        io.to(roomId).emit(ServerEvents.CHAT_MESSAGE, {
          username: 'Sistema',
          message: `${username} se ha desconectado`,
          timestamp: new Date(),
          isSpectator: false
        });
      }
      
      // Buscar como espectador
      const spectatorIndex = room.spectators.indexOf(socket.id);
      
      if (spectatorIndex !== -1) {
        // Eliminar al espectador
        room.spectators.splice(spectatorIndex, 1);
        
        // Si era el último en la sala, eliminar la sala
        if (room.players.length === 0 && room.spectators.length === 0) {
          rooms.delete(roomId);
        } else {
          // Notificar a todos los clientes en la sala que hubo un cambio
          io.to(roomId).emit(ServerEvents.ROOM_UPDATED, { room });
          
          // Enviar mensaje de chat
          io.to(roomId).emit(ServerEvents.CHAT_MESSAGE, {
            username: 'Sistema',
            message: `Un espectador se ha desconectado`,
            timestamp: new Date(),
            isSpectator: true
          });
        }
      }
    }
    
    // Actualizar la lista de salas para todos
    io.emit(ServerEvents.ROOMS_LIST, { 
      rooms: Array.from(rooms.values()).map(r => ({
        id: r.id,
        name: r.name,
        players: r.players.length,
        spectators: r.spectators.length,
        status: r.status
      }))
    });
  });
});

// Iniciar el servidor
server.listen(config.port, () => {
  console.log(`Servidor escuchando en el puerto ${config.port}`);
  console.log(`URL del servidor: http://localhost:${config.port}`);
});

