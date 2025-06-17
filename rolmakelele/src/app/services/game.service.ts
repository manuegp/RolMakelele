import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import {
  GameRoom,
  Character,
  Player,
  GameAction,
  Ability,
} from '../models/game.types';
import { environment } from '../../environments/environment';
import {
  ClientEvents,
  ServerEvents,
  RoomsListData,
  TurnStartedData,
  GameStartedData,
  GameEndedData,
  ErrorData,
  ChatMessageReceivedData,
  ActionResultData,
} from '../models/socket.types';

declare const io: any;

@Injectable({ providedIn: 'root' })
export class GameService {
  private socket: any;
  private username = '';
  private selectedCharacters: { id: string; abilityIds: string[] }[] = [];
  private currentRoomId: string | null = null;
  currentRoom$ = new BehaviorSubject<GameRoom | null>(null);
  turnInfo$ = new BehaviorSubject<TurnStartedData | null>(null);

  private readonly API_BASE = environment.apiBase;

  characters$ = new BehaviorSubject<Character[]>([]);
  rooms$ = new BehaviorSubject<RoomsListData['rooms']>([]);
  chatMessages$ = new BehaviorSubject<ChatMessageReceivedData[]>([]);

  constructor(
    private http: HttpClient,
    private router: Router,
    private zone: NgZone,
    private snackBar: MatSnackBar,
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
      .subscribe((res) => {
        this.characters$.next(res.characters);
      });
  }

  fetchCharacterAbilities(id: string) {
    return this.http.get<{ abilities: Ability[] }>(
      `${this.API_BASE}/api/characters/${id}/abilities`,
    );
  }

  fetchRooms() {
    this.http
      .get<RoomsListData>(`${this.API_BASE}/api/rooms`)
      .subscribe((res) => {
        this.rooms$.next(res.rooms);
      });
  }

  get userInfo(): Player | null {
    return (
      this.currentRoom$.value?.players.find((p) => p.id === this.socket?.id) ||
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
  setSelectedCharacters(chars: { id: string; abilityIds: string[] }[]) {
    this.selectedCharacters = chars;
  }

  getCurrentRoomId() {
    return this.currentRoomId;
  }
  isInGame() {
    return this.currentRoomId !== null;
  }

  async roomExists(roomId: string): Promise<boolean> {
    try {
      const res = await firstValueFrom(
        this.http.get<RoomsListData>(`${this.API_BASE}/api/rooms`),
      );
      this.rooms$.next(res.rooms);
      return res.rooms.some((r) => r.id === roomId);
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
      this.socket = io(environment.socketUrl);
      this.socket.on('connect', () => {
        if (this.currentRoomId) {
          this.socket.emit(ClientEvents.JOIN_ROOM, {
            roomId: this.currentRoomId,
            username: this.username,
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
                timeRemaining: null,
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
          if (
            data.room.id === this.currentRoomId &&
            data.room.status === 'waiting'
          ) {
            this.turnInfo$.next(null);
            this.router.navigate(['/characters', data.room.id]);
          }
          if (previous && data.room.id === this.currentRoomId) {
            const myId = this.socket.id;
            const prevOpp = previous.players.find((p) => p.id !== myId);
            const opp = data.room.players.find((p) => p.id !== myId);
            if (
              opp &&
              opp.isDisconnected &&
              !(prevOpp && prevOpp.isDisconnected)
            ) {
              this.snackBar.open(
                'Tu rival se ha desconectado. Esperando reconexión...',
                'Cerrar',
                { duration: 3000 },
              );
            } else if (
              opp &&
              !opp.isDisconnected &&
              prevOpp &&
              prevOpp.isDisconnected
            ) {
              this.snackBar.open('Tu rival se ha reconectado.', 'Cerrar', {
                duration: 3000,
              });
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
            timeRemaining: null,
          });
          this.router.navigate(['/combat', data.room.id]);
        });
      });
      this.socket.on(ServerEvents.TURN_STARTED, (data: TurnStartedData) => {
        this.zone.run(() => {
          this.turnInfo$.next(data);
          const room = this.currentRoom$.value;
          if (room) {
            room.currentTurn = {
              playerId: data.playerId,
              characterIndex: data.characterIndex,
            };
            this.currentRoom$.next({ ...room });
          }
        });
      });
      this.socket.on(ServerEvents.ACTION_RESULT, (data: ActionResultData) => {
        this.zone.run(() => {
          const room = this.currentRoom$.value;
          if (!room) return;
          const sourcePlayer = room.players.find(
            (p) => p.id === data.result.playerId,
          );
          const targetPlayer = room.players.find(
            (p) => p.id === data.result.targetPlayerId,
          );
          if (sourcePlayer && targetPlayer) {
            const sourceChar =
              sourcePlayer.selectedCharacters[data.result.sourceCharacterIndex];
            const targetChar =
              targetPlayer.selectedCharacters[data.result.targetCharacterIndex];
            for (const eff of data.result.effects) {
              const char = eff.target === 'source' ? sourceChar : targetChar;
              if (eff.type === 'damage') {
                char.currentHealth = Math.max(
                  0,
                  char.currentHealth - eff.value,
                );
                if (char.currentHealth === 0) char.isAlive = false;
              } else if (eff.type === 'heal') {
                char.currentHealth = Math.min(
                  char.stats.health,
                  char.currentHealth + eff.value,
                );
              } else if (
                (eff.type === 'buff' || eff.type === 'debuff') &&
                eff.stat
              ) {
                if (!char.statStages) {
                  char.statStages = {
                    speed: 0,
                    health: 0,
                    attack: 0,
                    defense: 0,
                    specialAttack: 0,
                    specialDefense: 0,
                    critical: 0,
                    evasion: 0,
                  };
                }
                if (!char.currentStats) {
                  char.currentStats = { ...char.stats };
                }
                const current = char.statStages[eff.stat] || 0;
                const newStage = Math.max(-6, Math.min(6, current + eff.value));
                char.statStages[eff.stat] = newStage;
                const base = char.stats[eff.stat];
                char.currentStats[eff.stat] = Math.max(1, base * (1 + 0.5 * newStage));
              }
            }
          }
          if (data.nextTurn) {
            room.currentTurn = {
              playerId: data.nextTurn.playerId,
              characterIndex: data.nextTurn.characterIndex,
            };
          }
          this.currentRoom$.next({ ...room });
        });
      });
      this.socket.on(ServerEvents.GAME_ENDED, (data: GameEndedData) => {
        this.zone.run(() => {
          let message = `Partida finalizada. Ganador: ${data.winnerUsername}`;
          if (
            data.reason === 'player_left' ||
            data.reason === 'player_disconnected'
          ) {
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
      this.socket.on(
        ServerEvents.CHAT_MESSAGE,
        (msg: ChatMessageReceivedData) => {
          this.zone.run(() => {
            const current = this.chatMessages$.value;
            this.chatMessages$.next([...current, msg]);
          });
        },
      );
    }
  }

  connect() {
    this.ensureSocket();
  }

  joinRoom(roomId: string) {
    this.ensureSocket();
    this.socket.emit(ClientEvents.JOIN_ROOM, {
      roomId,
      username: this.username,
    });
    sessionStorage.setItem('roomId', roomId);
  }

  createRoom(roomName: string) {
    this.ensureSocket();
    this.socket.emit(ClientEvents.CREATE_ROOM, {
      roomName,
      username: this.username,
    });
  }

  sendSelectedCharacters() {
    this.ensureSocket();
    this.socket.emit(ClientEvents.SELECT_CHARACTERS, {
      characters: this.selectedCharacters,
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
