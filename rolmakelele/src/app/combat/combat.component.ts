import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-combat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combat.component.html'
})
export class CombatComponent {
  roomId: string | null = null;

  constructor(route: ActivatedRoute) {
    this.roomId = route.snapshot.paramMap.get('roomId');
  }
}
