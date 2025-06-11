import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ability } from '../models/game.types';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-ability-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ability-selector.component.html'
})
export class AbilitySelectorComponent implements OnInit {
  @Input() characterId!: string;
  @Input() selectedIds: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();

  abilities: Ability[] = [];

  constructor(private game: GameService) {}

  ngOnInit() {
    this.game
      .fetchCharacterAbilities(this.characterId)
      .subscribe(res => (this.abilities = res.abilities));
  }

  toggleAbility(id: string) {
    const idx = this.selectedIds.indexOf(id);
    if (idx >= 0) {
      this.selectedIds.splice(idx, 1);
    } else if (this.selectedIds.length < 4) {
      this.selectedIds.push(id);
    }
    this.selectionChange.emit([...this.selectedIds]);
  }
}
