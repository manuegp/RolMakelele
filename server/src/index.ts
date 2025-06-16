import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { instrument } from '@socket.io/admin-ui';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

import config from './config/config';
import {
  GameRoom,
  Character,
  CharacterType
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
// Servir archivos estáticos desde la carpeta "public"
const publicDir = path.resolve(process.cwd(), 'public');
app.use('/public', express.static(publicDir));

const server = http.createServer(app);
const socketOrigins =
  config.corsOrigin === '*'
    ? '*'
    : Array.isArray(config.corsOrigin)
    ? [...config.corsOrigin, 'https://admin.socket.io']
    : [config.corsOrigin, 'https://admin.socket.io'];

const io = new Server(server, {
  cors: {
    origin: socketOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

instrument(io, { auth: false });

const rooms: Map<string, GameRoom> = new Map();
const disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
let characters: Character[] = [];
let moves: Map<string, any> = new Map();
let characterTypes: CharacterType[] = [];

try {
  const movesRaw = fs.readFileSync(
    path.resolve(process.cwd(), config.movesDataPath),
    'utf-8'
  );
  const parsedMoves = JSON.parse(movesRaw).moves;
  moves = new Map(parsedMoves.map((m: any) => [m.id, m]));

  const typesRaw = fs.readFileSync(
    path.resolve(process.cwd(), config.characterTypesDataPath),
    'utf-8'
  );
  characterTypes = JSON.parse(typesRaw);

  const data = fs.readFileSync(
    path.resolve(process.cwd(), config.charactersDataPath),
    'utf-8'
  );
  const parsed = JSON.parse(data);
  characters = parsed.characters.map((c: any) => ({
    ...c,
    types: (c.types || [])
      .map((name: string) => characterTypes.find(t => t.name === name))
      .filter(Boolean),
    availableAbilities: (c.availableAbilities || []).map((id: string) => moves.get(id)).filter(Boolean),
    abilities: c.abilities
      ? c.abilities.map((id: string) => moves.get(id)).filter(Boolean)
      : []
  }));
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
