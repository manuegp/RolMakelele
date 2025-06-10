import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CharacterState } from '../../models/game.models';

@Component({
  selector: 'app-character-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-box.component.html',
  styleUrl: './character-box.component.scss'
})
export class CharacterBoxComponent {
  @Input() character: CharacterState | null = null;

  get healthPercent(): number {
    if (!this.character) {
      return 0;
    }
    return (this.character.currentHealth / this.character.stats.health) * 100;
  }
}
