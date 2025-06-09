import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rooms.component.html'
})
export class RoomsComponent implements OnInit {
  rooms: any[] = [];
  newRoomName = '';

  constructor(public game: GameService) {}

  ngOnInit() {
    this.game.fetchRooms();
    this.game.rooms$.subscribe(r => (this.rooms = r));
    this.game.connect();
  }

  join(id: string) {
    this.game.joinRoom(id);
  }

  create() {
    if (this.newRoomName) {
      this.game.createRoom(this.newRoomName);
    }
  }
}
