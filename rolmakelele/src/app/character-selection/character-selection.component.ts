import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-character-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './character-selection.component.html'
})
export class CharacterSelectionComponent implements OnInit {
  selected: string[] = [];
  characters: any[] = [];
  roomId!: string;
  room: any;

  constructor(private game: GameService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('roomId')!;
    this.game.connect();
    this.game.fetchCharacters();
    this.game.characters$.subscribe(c => (this.characters = c));
    this.game.currentRoom$.subscribe(c => (this.room = c));
  }

  toggle(id: string) {
    if (this.selected.includes(id)) {
      this.selected = this.selected.filter(c => c !== id);
    } else if (this.selected.length < 4) {
      this.selected.push(id);
    }
  }

  ready() {
    if (this.selected.length === 4) {
      this.game.setSelectedCharacters(this.selected);
      this.game.sendSelectedCharacters();
      this.game.ready();
    }
  }

  leave() {
    this.game.leaveGame();
    this.game.fetchRooms();
    this.game.connect();
  }

  get getPlayersCount () {
    return this.room?.players ? Object.keys(this.room.players).length : 0;
  }
}
