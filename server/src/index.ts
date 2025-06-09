import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import readline from 'readline';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

import config from './config/config';
import {
  GameRoom,
  Character
} from './types/game.types';
import { ServerEvents } from './types/socket.types';

import { registerHealthRoute } from './routes/health';
import { registerCharactersRoute } from './routes/characters';
import { registerRoomsRoute } from './routes/rooms';
import { registerCreateRoom } from './events/createRoom';
import { registerJoinRoom } from './events/joinRoom';
import { registerJoinAsSpectator } from './events/joinAsSpectator';
import { registerSelectCharacters } from './events/selectCharacters';
import { registerReady } from './events/ready';
import { registerPerformAction } from './events/performAction';
import { registerLeaveRoom } from './events/leaveRoom';
import { registerChatMessage } from './events/chatMessage';
import { registerDisconnect } from './events/disconnect';

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
});

const rooms: Map<string, GameRoom> = new Map();
const disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
let characters: Character[] = [];

try {
  const data = fs.readFileSync(
    path.resolve(process.cwd(), config.charactersDataPath),
    'utf-8'
  );
  const parsed = JSON.parse(data);
  characters = parsed.characters;
  console.log(`Cargados ${characters.length} personajes`);
} catch (error) {
  console.error('Error al cargar los personajes:', error);
  process.exit(1);
}

// API routes
registerHealthRoute(app);
registerCharactersRoute(app, characters);
registerRoomsRoute(app, rooms);

io.on('connection', socket => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.emit(ServerEvents.CHARACTERS_LIST, { characters });
  socket.emit(ServerEvents.ROOMS_LIST, {
    rooms: Array.from(rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      players: r.players.length,
      spectators: r.spectators.length,
      status: r.status
    }))
  });

  registerCreateRoom(io, socket, rooms);
  registerJoinRoom(io, socket, rooms, disconnectTimers);
  registerJoinAsSpectator(io, socket, rooms);
  registerSelectCharacters(io, socket, rooms);
  registerReady(io, socket, rooms);
  registerPerformAction(io, socket, rooms);
  registerLeaveRoom(io, socket, rooms);
  registerChatMessage(io, socket, rooms);
  registerDisconnect(io, socket, rooms, disconnectTimers);
});

server.listen(config.port, () => {
  console.log(`Servidor escuchando en el puerto ${config.port}`);
  console.log(`URL del servidor: http://localhost:${config.port}`);
  startCLI(rooms);
});

function startCLI(rooms: Map<string, GameRoom>) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('CLI iniciada. Escribe "help" para ver los comandos disponibles.');
  rl.setPrompt('> ');
  rl.prompt();

  rl.on('line', line => {
    const [command, ...args] = line.trim().split(/\s+/);
    switch (command) {
      case 'help':
        console.log('Comandos disponibles:');
        console.log(' rooms               Lista todas las salas');
        console.log(' players             Lista todos los jugadores conectados');
        console.log(' room <id>           Muestra detalles de una sala');
        console.log(' exit                Cierra la CLI (el servidor sigue activo)');
        break;
      case 'rooms':
        if (rooms.size === 0) {
          console.log('No hay salas activas');
        } else {
          for (const r of rooms.values()) {
            console.log(`${r.id} - ${r.name} | Estado: ${r.status} | Jugadores: ${r.players.length}/${r.maxPlayers} | Espectadores: ${r.spectators.length}/${r.maxSpectators}`);
          }
        }
        break;
      case 'players':
        let count = 0;
        for (const r of rooms.values()) {
          for (const p of r.players) {
            console.log(`${p.username} (${p.id}) - Sala: ${r.name} (${r.id})${p.isReady ? ' [listo]' : ''}${p.isDisconnected ? ' [desconectado]' : ''}`);
            count++;
          }
        }
        if (count === 0) {
          console.log('No hay jugadores conectados');
        }
        break;
      case 'room':
        const id = args[0];
        if (!id) {
          console.log('Debes proporcionar el id de la sala');
          break;
        }
        const room = rooms.get(id);
        if (!room) {
          console.log('Sala no encontrada');
        } else {
          console.log(`Sala ${room.name} (${room.id}) - Estado: ${room.status}`);
          console.log(` Jugadores (${room.players.length}/${room.maxPlayers}):`);
          for (const p of room.players) {
            console.log(`  - ${p.username} (${p.id})${p.isReady ? ' [listo]' : ''}${p.isDisconnected ? ' [desconectado]' : ''}`);
          }
          console.log(` Espectadores (${room.spectators.length}/${room.maxSpectators}): ${room.spectators.join(', ') || 'ninguno'}`);
        }
        break;
      case 'exit':
        rl.close();
        break;
      default:
        console.log(`Comando desconocido: ${command}`);
        console.log('Escribe "help" para ver los comandos disponibles.');
    }
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('CLI cerrada');
  });
}
