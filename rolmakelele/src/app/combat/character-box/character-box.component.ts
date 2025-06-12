import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CharacterState, Stats } from '../../models/game.types';
import { LABELS_MAP } from '../../constants/stats.map';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-character-box',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
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

  readonly statLabels = LABELS_MAP;

  get healthPercent(): number {
    if (!this.character) {
      return 0;
    }
    return (this.character.currentHealth / this.character.stats.health) * 100;
  }

  getCurrentStat(key: keyof Stats): number {
    if (!this.character) return 0;
    return this.character.currentStats?.[key] ?? this.character.stats[key];
  }

  getStatColor(key: keyof Stats): string {
    if (!this.character) return '';
    const base = this.character.stats[key];
    const current = this.getCurrentStat(key);
    if (current < base) {
      return 'red';
    }
    if (current > base) {
      return 'blue';
    }
    return 'inherit';
  }

  onClick() {
    if (this.selectable) {
      this.selected.emit();
    }
  }
}
