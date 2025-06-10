import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../services/game.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-combat',
  standalone: true,
  imports: [CommonModule, CommonModule],
  templateUrl: './combat.component.html',
  styleUrl: './combat.component.scss'
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

  get myPlayerId(): string | null {
    return this.game.userInfo?.id || null;
  }

  isMyPlayer(playerId: string): boolean {
    return this.myPlayerId === playerId;
  }

  getCharacterName(room: any, playerId: string, characterIndex: number): string {
    const player = room?.players.find((p: any) => p.id === playerId);
    return player?.selectedCharacters?.[characterIndex]?.name || '';
  }

  

  leave() {
    this.game.leaveGame();
    this.game.fetchRooms();
    this.game.connect();
  }
}
