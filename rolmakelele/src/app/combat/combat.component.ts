import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../services/game.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-combat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combat.component.html'
})
export class CombatComponent implements OnInit {
  roomId: string | null = null;
  room$!: Observable<any | null>;
  turn$!: Observable<any | null>;

  constructor(route: ActivatedRoute, private game: GameService) {
    this.roomId = route.snapshot.paramMap.get('roomId');
  }

  ngOnInit() {
    this.room$ = this.game.currentRoom$;
    this.turn$ = this.game.turnInfo$;
  }
}
