import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../services/game.service';
import { Character, GameRoom } from '../models/game.types';
import { AbilitySelectorComponent } from './ability-selector.component';

@Component({
  selector: 'app-character-selection',
  standalone: true,
  imports: [CommonModule, FormsModule, AbilitySelectorComponent],
  templateUrl: './character-selection.component.html'
})
export class CharacterSelectionComponent implements OnInit {
  selected: { id: string; abilities: string[] }[] = [];
  characters: Character[] = [];
  roomId!: string;
  room: GameRoom | null = null;

  constructor(private game: GameService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('roomId')!;
    this.game.fetchCharacters();
    this.game.characters$.subscribe(c => (this.characters = c));
    this.game.currentRoom$.subscribe(c => (this.room = c));
  }

  get isReady() {
    return this.game.userInfo?.isReady || false;
  }

  toggle(id: string) {
    const index = this.selected.findIndex(c => c.id === id);
    if (index >= 0) {
      this.selected.splice(index, 1);
    } else if (this.selected.length < 4) {
      this.selected.push({ id, abilities: [] });
    }
  }

  isSelected(id: string): boolean {
    return this.selected.some(c => c.id === id);
  }

  getSelectedAbilities(id: string): string[] {
    const entry = this.selected.find(c => c.id === id);
    return entry ? entry.abilities : [];
  }

  isSelectionValid(): boolean {
    return (
      this.selected.length === 4 &&
      this.selected.every(c => c.abilities.length === 4)
    );
  }

  onAbilitySelectionChange(charId: string, abilityIds: string[]) {
    const entry = this.selected.find(c => c.id === charId);
    if (entry) {
      entry.abilities = abilityIds;
    }
  }

  ready() {
    const valid = this.selected.length === 4 &&
      this.selected.every(c => c.abilities.length === 4);
    if (valid) {
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
