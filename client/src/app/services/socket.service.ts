import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Observable, fromEvent } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket?: Socket;

  connect(): void {
    if (!this.socket) {
      this.socket = io(environment.socketUrl);
    }
  }

  onRoomsList(): Observable<{ rooms: any[] }> {
    this.connect();
    return fromEvent(this.socket as Socket, 'rooms_list') as Observable<{ rooms: any[] }>;
  }

  createRoom(name: string, username: string) {
    this.connect();
    this.socket?.emit('create_room', { roomName: name, username });
  }

  joinRoom(roomId: string, username: string) {
    this.connect();
    this.socket?.emit('join_room', { roomId, username });
  }
}
