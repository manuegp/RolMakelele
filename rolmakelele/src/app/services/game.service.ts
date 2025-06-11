import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import {
  GameRoom,
  Character,
  Player,
  GameAction
} from '../models/game.types';
import {
  ClientEvents,
  ServerEvents,
  RoomsListData,
  TurnStartedData,
  GameStartedData,
  GameEndedData,
  ErrorData,
  ChatMessageReceivedData
} from '../models/socket.types';

declare const io: any;

@Injectable({ providedIn: 'root' })
export class GameService {
  private socket: any;
  private username = '';
  private selectedCharacters: string[] = [];
  private currentRoomId: string | null = null;
  currentRoom$ = new BehaviorSubject<GameRoom | null>(null);
  turnInfo$ = new BehaviorSubject<TurnStartedData | null>(null);

  private readonly API_BASE = 'http://localhost:3001';

  characters$ = new BehaviorSubject<Character[]>([]);
  rooms$ = new BehaviorSubject<RoomsListData['rooms']>([]);
  chatMessages$ = new BehaviorSubject<ChatMessageReceivedData[]>([]);

  constructor(
    private http: HttpClient,
    private router: Router,
    private zone: NgZone,
    private snackBar: MatSnackBar
  ) {
    const storedUser = sessionStorage.getItem('username');
    if (storedUser) {
      this.username = storedUser;
    }
    const storedRoom = sessionStorage.getItem('roomId');
    if (storedRoom) {
      this.currentRoomId = storedRoom;
    }
  }

  fetchCharacters() {
    this.http
      .get<{ characters: Character[] }>(`${this.API_BASE}/api/characters`)
      .subscribe(res => {
        this.characters$.next(res.characters);
      });
  }

  fetchRooms() {
    this.http
      .get<RoomsListData>(`${this.API_BASE}/api/rooms`)
      .subscribe(res => {
        this.rooms$.next(res.rooms);
      });
  }

  get userInfo(): Player | null {
    return (
      this.currentRoom$.value?.players.find(p => p.id === this.socket?.id) ||
      null
    );
  }

  setUsername(name: string) {
    this.username = name;
    sessionStorage.setItem('username', name);
  }
  getUsername() {
    return this.username;
  }
  hasUsername() {
    return this.username.trim().length > 0;
  }
  setSelectedCharacters(ids: string[]) { this.selectedCharacters = ids; }

  getCurrentRoomId() { return this.currentRoomId; }
  isInGame() { return this.currentRoomId !== null; }

  async roomExists(roomId: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.get<RoomsListData>(`${this.API_BASE}/api/rooms`)
      );
      this.rooms$.next(res.rooms);
      return res.rooms.some(r => r.id === roomId);
    } catch {
      return false;
    }
  }

  clearRoom() {
    this.currentRoomId = null;
    this.currentRoom$.next(null);
    this.turnInfo$.next(null);
    sessionStorage.removeItem('roomId');
    this.chatMessages$.next([]);
  }

  private ensureSocket() {
    if (!this.socket) {
      this.socket = io('http://localhost:3001');
      this.socket.on('connect', () => {
        if (this.currentRoomId) {
          this.socket.emit(ClientEvents.JOIN_ROOM, {
            roomId: this.currentRoomId,
            username: this.username
          });
        }
      });
      this.socket.on(ServerEvents.ROOMS_LIST, (data: RoomsListData) => {
        this.zone.run(() => this.rooms$.next(data.rooms));
      });
      this.socket.on(ServerEvents.ROOM_JOINED, (data: { room: GameRoom }) => {
        const roomId = data.room.id;
        this.currentRoomId = roomId;
        sessionStorage.setItem('roomId', roomId);
        this.zone.run(() => {
          this.currentRoom$.next(data.room);
          if (
            data.room.status === 'waiting' ||
            data.room.status === 'character_selection'
          ) {
            this.router.navigate(['/characters', roomId]);
          } else {
            if (data.room.currentTurn) {
              this.turnInfo$.next({
                ...data.room.currentTurn,
                timeRemaining: null
              });
            }
            this.router.navigate(['/combat', roomId]);
          }
        });
      });
      this.socket.on(ServerEvents.ROOM_UPDATED, (data: { room: GameRoom }) => {
        this.zone.run(() => {
          const previous = this.currentRoom$.value;
          this.currentRoom$.next(data.room);
          if (data.room.id === this.currentRoomId && data.room.status === 'waiting') {
            this.turnInfo$.next(null);
            this.router.navigate(['/characters', data.room.id]);
          }
          if (previous && data.room.id === this.currentRoomId) {
            const myId = this.socket.id;
            const prevOpp = previous.players.find(p => p.id !== myId);
            const opp = data.room.players.find(p => p.id !== myId);
            if (opp && opp.isDisconnected && !(prevOpp && prevOpp.isDisconnected)) {
              this.snackBar.open('Tu rival se ha desconectado. Esperando reconexión...', 'Cerrar', { duration: 3000 });
            } else if (opp && !opp.isDisconnected && prevOpp && prevOpp.isDisconnected) {
              this.snackBar.open('Tu rival se ha reconectado.', 'Cerrar', { duration: 3000 });
            }
          }
        });
      });
      this.socket.on(ServerEvents.GAME_STARTED, (data: GameStartedData) => {
        this.zone.run(() => {
          this.currentRoom$.next(data.room);
          const first = data.turnOrder[0];
          this.turnInfo$.next({
            playerId: first.playerId,
            characterIndex: first.characterIndex,
            timeRemaining: null
          });
          this.router.navigate(['/combat', data.room.id]);
        });
      });
      this.socket.on(ServerEvents.TURN_STARTED, (data: TurnStartedData) => {
        this.zone.run(() => this.turnInfo$.next(data));
      });
      this.socket.on(ServerEvents.GAME_ENDED, (data: GameEndedData) => {
        this.zone.run(() => {
          let message = `Partida finalizada. Ganador: ${data.winnerUsername}`;
          if (data.reason === 'player_left' || data.reason === 'player_disconnected') {
            if (data.winnerId === this.socket.id) {
              message = 'El rival se ha rendido. ¡Has ganado!';
            } else {
              message = 'Has abandonado la partida.';
            }
          } else if (data.reason === 'player_disconnected_timeout') {
            if (data.winnerId === this.socket.id) {
              message = 'Tu rival no volvió a conectarse. ¡Has ganado!';
            } else {
              message = 'Tardaste demasiado en reconectarte.';
            }
          }
          this.snackBar.open(message, 'Cerrar', { duration: 3000 });
          this.currentRoomId = null;
          this.currentRoom$.next(null);
          this.turnInfo$.next(null);
          sessionStorage.removeItem('roomId');
          this.router.navigate(['/rooms']);
        });
      });
      this.socket.on(ServerEvents.ERROR, (err: ErrorData) => {
        this.zone.run(() => {
          this.snackBar.open(err.message, 'Cerrar', { duration: 3000 });
          if (err.code === 'ROOM_NOT_FOUND') {
            this.clearRoom();
            this.router.navigate(['/rooms']);
          }
        });
      });
      this.socket.on(ServerEvents.CHAT_MESSAGE, (msg: ChatMessageReceivedData) => {
        this.zone.run(() => {
          const current = this.chatMessages$.value;
          this.chatMessages$.next([...current, msg]);
        });
      });
    }
  }

  connect() {
    this.ensureSocket();
  }

  joinRoom(roomId: string) {
    this.ensureSocket();
    this.socket.emit(ClientEvents.JOIN_ROOM, {
      roomId,
      username: this.username
    });
    sessionStorage.setItem('roomId', roomId);
  }

  createRoom(roomName: string) {
    this.ensureSocket();
    this.socket.emit(ClientEvents.CREATE_ROOM, {
      roomName,
      username: this.username
    });
  }

  sendSelectedCharacters() {
    this.ensureSocket();
    this.socket.emit(ClientEvents.SELECT_CHARACTERS, {
      characterIds: this.selectedCharacters
    });
  }

  ready() {
    this.ensureSocket();
    this.socket.emit(ClientEvents.READY);
  }

  sendChatMessage(message: string) {
    this.ensureSocket();
    this.socket.emit(ClientEvents.CHAT_MESSAGE, { message });
  }

  performAction(action: GameAction) {
    this.ensureSocket();
    this.socket.emit(ClientEvents.PERFORM_ACTION, action);
  }

  leaveGame() {
    if (this.currentRoomId) {
      this.ensureSocket();
      this.socket.emit(ClientEvents.LEAVE_ROOM);
      this.router.navigate(['/rooms']);
    }
    this.currentRoomId = null;
    sessionStorage.removeItem('roomId');
    this.chatMessages$.next([]);
  }
}
