import { Component, Input, Output, EventEmitter, ElementRef, AfterViewInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CharacterState, Stats } from '../../models/game.types';
import { LABELS_MAP } from '../../constants/stats.map';
import Tooltip from 'bootstrap/js/dist/tooltip';

@Component({
  selector: 'app-character-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-box.component.html',
  styleUrl: './character-box.component.scss'
})
export class CharacterBoxComponent implements AfterViewInit, OnChanges {
  constructor(private elementRef: ElementRef) {}

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

  tooltip?: any;

  get healthPercent(): number {
    if (!this.character) {
      return 0;
    }
    return (this.character.currentHealth / this.character.stats.health) * 100;
  }

  get tooltipContent(): string {
    if (!this.character) {
      return '';
    }
    return this.statKeys
      .map(key => {
        const color = this.getStatColor(key);
        const label = this.statLabels[key];
        const value = this.getCurrentStat(key);
        return `<div><span style="color:${color}">${label}: ${value}</span></div>`;
      })
      .join('');
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

  ngAfterViewInit(): void {
    const el = this.elementRef.nativeElement.querySelector('.character-box');
    if (el) {
      this.tooltip = Tooltip.getOrCreateInstance(el, { html: true });
      this.tooltip.setContent({ '.tooltip-inner': this.tooltipContent });
    }
  }

  ngOnChanges(): void {
    if (this.tooltip) {
      this.tooltip.setContent({ '.tooltip-inner': this.tooltipContent });
    }
  }

  onClick() {
    if (this.selectable) {
      this.selected.emit();
    }
  }
}
