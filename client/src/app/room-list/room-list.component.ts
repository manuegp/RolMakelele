import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { GameStateService } from '../services/game-state.service';
import { SocketService } from '../services/socket.service';

@Component({
  selector: 'app-room-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatListModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './room-list.component.html',
  styleUrls: ['./room-list.component.scss']
})
export class RoomListComponent implements OnInit {
  rooms: any[] = [];
  newRoomName = '';

  constructor(
    private http: HttpClient,
    private state: GameStateService,
    private socket: SocketService
  ) {}

  ngOnInit(): void {
    this.socket.onRoomsList().subscribe(data => this.rooms = data.rooms);
    this.http.get<{ rooms: any[] }>('/api/rooms')
      .subscribe(res => this.rooms = res.rooms);
  }

  createRoom() {
    if (!this.newRoomName) return;
    this.socket.createRoom(this.newRoomName, this.state.username);
    this.newRoomName = '';
  }

  joinRoom(id: string) {
    this.socket.joinRoom(id, this.state.username);
  }
}
