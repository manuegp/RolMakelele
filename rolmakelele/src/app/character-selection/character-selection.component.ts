import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-character-selection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './character-selection.component.html'
})
export class CharacterSelectionComponent implements OnInit {
  username = '';
  selected: string[] = [];
  characters: any[] = [];

  constructor(private game: GameService, private router: Router) {}

  ngOnInit() {
    this.game.fetchCharacters();
    this.game.characters$.subscribe(c => (this.characters = c));
  }

  toggle(id: string) {
    if (this.selected.includes(id)) {
      this.selected = this.selected.filter(c => c !== id);
    } else if (this.selected.length < 4) {
      this.selected.push(id);
    }
  }

  next() {
    if (this.username && this.selected.length === 4) {
      this.game.setUsername(this.username);
      this.game.setSelectedCharacters(this.selected);
      this.router.navigate(['/rooms']);
    }
  }
}
