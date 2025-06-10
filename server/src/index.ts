import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import monitor from 'socket.io-monitor';
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
import { getRoomsListData } from './utils/roomHelpers';

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

// Expose socket.io-monitor server for realtime debugging
const { server: monitorServer } = monitor.bind(io, {
  port: config.monitorPort,
  host: 'localhost'
});

monitorServer.then(() => {
  console.log(`Socket.IO monitor disponible en http://localhost:${config.monitorPort}`);
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
  socket.emit(ServerEvents.ROOMS_LIST, getRoomsListData(rooms));

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
});
