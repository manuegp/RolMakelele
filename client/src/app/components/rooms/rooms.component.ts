import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';

interface Room {
  id: string;
  name: string;
  players: number;
  spectators: number;
  status: string;
}

@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.component.html'
})
export class RoomsComponent implements OnInit {
  rooms: Room[] = [];
  roomName = '';
  socket!: Socket;
  username = '';
  characters: string[] = [];

  ngOnInit(): void {
    this.username = localStorage.getItem('username') || '';
    this.characters = JSON.parse(localStorage.getItem('characters') || '[]');

    this.socket = io('http://localhost:3001');
    this.socket.on('rooms_list', (data: any) => {
      this.rooms = data.rooms;
    });
  }

  create(): void {
    if (this.roomName) {
      this.socket.emit('create_room', { roomName: this.roomName, username: this.username });
    }
  }

  join(roomId: string): void {
    this.socket.emit('join_room', { roomId, username: this.username });
  }

  constructor(private router: Router) {}
}
