import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../services/game.service';
import { Observable } from 'rxjs';
import { CharacterBoxComponent } from './character-box/character-box.component';

@Component({
  selector: 'app-combat',
  standalone: true,
  imports: [CommonModule, CharacterBoxComponent],
  templateUrl: './combat.component.html',
  styleUrl: './combat.component.scss'
})
export class CombatComponent implements OnInit {
  roomId: string | null = null;
  room$!: Observable<any | null>;
  turn$!: Observable<any | null>;
  rows = [0, 1, 2, 3];

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

  getMyCharacters(room: any): any[] {
    return (
      room?.players.find((p: any) => p.id === this.myPlayerId)?.selectedCharacters || []
    );
  }

  getOpponentCharacters(room: any): any[] {
    return (
      room?.players.find((p: any) => p.id !== this.myPlayerId)?.selectedCharacters || []
    );
  }

  isMyTurn(room: any): boolean {
    return room.currentTurn.playerId === this.myPlayerId;
  }

  getCurrentCharacterAbilities(room: any): any[] {
    const turn = room.currentTurn;
    if (!turn) return [];
    const player = room.players.find((p: any) => p.id === turn.playerId);
    return player?.selectedCharacters?.[turn.characterIndex]?.abilities || [];
  }

  leave() {
    this.game.leaveGame();
    this.game.fetchRooms();
    this.game.connect();
  }
}
