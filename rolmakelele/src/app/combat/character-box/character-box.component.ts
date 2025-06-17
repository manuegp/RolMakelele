import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CharacterState, Stats } from '../../models/game.types';
import { NgxTooltip } from '@ngx-popovers/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { TypeService } from '../../services/type.service';
import { LABELS_MAP } from '../../constants/stats.map';

@Component({
  selector: 'app-character-box',
  standalone: true,
  imports: [CommonModule, NgxTooltip, MatChipsModule],
  templateUrl: './character-box.component.html',
  styleUrl: './character-box.component.scss'
})
export class CharacterBoxComponent {
  @Input() character: CharacterState | null = null;
  @Input() selectable = false;
  @Output() selected = new EventEmitter<void>();

  readonly statKeys: (keyof Stats)[] = [
    'speed',
    'health',
    'attack',
    'defense',
    'specialAttack',
    'specialDefense',
    'critical',
    'evasion'
  ];
  readonly labels = LABELS_MAP;

  constructor(public types: TypeService) {}

  get healthPercent(): number {
    if (!this.character) {
      return 0;
    }
    return (this.character.currentHealth / this.character.stats.health) * 100;
  }

  onClick() {
    if (this.selectable) {
      this.selected.emit();
    }
  }

  getStatValue(stat: keyof Stats): number {
    if (!this.character) return 0;
    return this.character.currentStats?.[stat] ?? this.character.stats[stat];
  }

  getStatColor(stat: keyof Stats): string {
    if (!this.character) return 'black';
    const base = this.character.stats[stat];
    const current = this.character.currentStats?.[stat] ?? base;
    if (current < base) return 'red';
    if (current > base) return 'blue';
    return 'black';
  }

  getStatStage(stat: keyof Stats): number {
    if (!this.character || !this.character.statStages) return 0;
    return this.character.statStages[stat] || 0;
  }

  // get CurrentHealth(): number {

  // }

}
