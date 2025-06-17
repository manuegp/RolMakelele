import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Ability, Character, Effect, EffectTarget } from '../models/game.types';
import { GameService } from '../services/game.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { environment } from '../../environments/environment';
import { TypeService } from '../services/type.service';
import { UniqueTagComponent } from '../unique-tag/unique-tag.component';
import { LABELS_MAP } from '../constants/stats.map';
import { STATUS_LABELS } from '../constants/statuses.map';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../constants/categories.map';

@Component({
  selector: 'app-ability-selector',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatChipsModule, UniqueTagComponent],
  templateUrl: './ability-selector.component.html',
})
export class AbilitySelectorComponent implements OnInit {
  @Input() character!: Character;
  @Input() selectedIds: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();

  abilities: Ability[] = [];
  readonly serverUrl = environment.apiBase;

  constructor(private game: GameService, public types: TypeService) {}

  getCategoryLabel(cat: Ability['category']): string {
    return CATEGORY_LABELS[cat];
  }

  getCategoryColor(cat: Ability['category']): string {
    return CATEGORY_COLORS[cat];
  }

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

  formatEffect(effect: Effect): string {
    const targets: Record<EffectTarget, string> = {
      self: 'a sí mismo',
      opponent: 'al enemigo',
      allies: 'a los aliados',
    };

    let text = '';
    switch (effect.type) {
      case 'damage':
        text = `Daño ${effect.value}`;
        if (effect.ignoreDefense) {
          text += ` (ignora defensa ${effect.ignoreDefense * 100}%)`;
        }
        break;
      case 'heal':
        text = `Cura ${effect.value}`;
        break;
      case 'buff':
        const buffStat = effect.stat ? LABELS_MAP[effect.stat] || effect.stat : '';
        text = `Aumenta ${buffStat} +${effect.value}`;
        break;
      case 'debuff':
        const debuffStat = effect.stat ? LABELS_MAP[effect.stat] || effect.stat : '';
        text = `Reduce ${debuffStat} ${effect.value}`;
        break;
      case 'status':
        const status = effect.status ? STATUS_LABELS[effect.status] || effect.status : '';
        text = `Aplica estado ${status}`;
        if (effect.statusChance !== undefined) {
          text += ` (${effect.statusChance * 100}%)`;
        }
        break;
    }

    if (effect.duration) {
      text += ` durante ${effect.duration} turnos`;
    }

    return `${targets[effect.target]}: ${text}`;
  }
}
