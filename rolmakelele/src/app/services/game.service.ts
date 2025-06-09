import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

declare const io: any;

@Injectable({ providedIn: 'root' })
export class GameService {
  private socket: any;
  private username = '';
  private selectedCharacters: string[] = [];
  private currentRoomId: string | null = null;

  private readonly API_BASE = 'http://localhost:3001';

  characters$ = new BehaviorSubject<any[]>([]);
  rooms$ = new BehaviorSubject<any[]>([]);

  constructor(private http: HttpClient, private router: Router, private zone: NgZone) {}

  fetchCharacters() {
    this.http
      .get<{ characters: any[] }>(`${this.API_BASE}/api/characters`)
      .subscribe(res => {
        this.characters$.next(res.characters);
      });
  }

  fetchRooms() {
    this.http
      .get<{ rooms: any[] }>(`${this.API_BASE}/api/rooms`)
      .subscribe(res => {
        this.rooms$.next(res.rooms);
      });
  }

  setUsername(name: string) { this.username = name; }
  setSelectedCharacters(ids: string[]) { this.selectedCharacters = ids; }

  private ensureSocket() {
    if (!this.socket) {
      this.socket = io('http://localhost:3001');
      this.socket.on('rooms_list', (data: any) => {
        this.zone.run(() => this.rooms$.next(data.rooms));
      });
      this.socket.on('room_joined', (data: any) => {
        this.currentRoomId = data.room.id;
      });
      this.socket.on('game_started', (data: any) => {
        const roomId = data.room.id;
        this.zone.run(() => {
          this.router.navigate(['/combat', roomId]);
        });
      });
    }
  }

  connect() {
    this.ensureSocket();
  }

  joinRoom(roomId: string) {
    this.ensureSocket();
    this.socket.emit('join_room', { roomId, username: this.username });
    this.socket.emit('select_characters', { characterIds: this.selectedCharacters });
  }

  createRoom(roomName: string) {
    this.ensureSocket();
    this.socket.emit('create_room', { roomName, username: this.username });
    this.socket.emit('select_characters', { characterIds: this.selectedCharacters });
  }
}
