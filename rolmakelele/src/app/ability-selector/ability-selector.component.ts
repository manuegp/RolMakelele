import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ability, Character } from '../models/game.types';
import { GameService } from '../services/game.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { environment } from '../../environments/environment';
import { TypeService } from '../services/type.service';

@Component({
  selector: 'app-ability-selector',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatChipsModule],
  templateUrl: './ability-selector.component.html',
})
export class AbilitySelectorComponent implements OnInit {
  @Input() character!: Character;
  @Input() selectedIds: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();

  abilities: Ability[] = [];
  readonly serverUrl = environment.apiBase;

  constructor(private game: GameService, public types: TypeService) {}

  ngOnInit() {
    this.game
      .fetchCharacterAbilities(this.character.id)
      .subscribe((res) => (this.abilities = res.abilities));
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
