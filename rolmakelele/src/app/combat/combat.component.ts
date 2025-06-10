import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../services/game.service';
import { Observable } from 'rxjs';
import { GameRoom, CharacterState, Player } from '../models/game.models';
import { TurnStartedData } from '../models/socket.models';
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
  room$!: Observable<GameRoom | null>;
  turn$!: Observable<TurnStartedData | null>;
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

  getCharacterName(room: GameRoom | null, playerId: string, characterIndex: number): string {
    const player = room?.players.find((p: Player) => p.id === playerId);
    return player?.selectedCharacters?.[characterIndex]?.name || '';
  }

  getMyCharacters(room: GameRoom | null): CharacterState[] {
    return (
      room?.players.find((p: Player) => p.id === this.myPlayerId)?.selectedCharacters || []
    );
  }

  getOpponentCharacters(room: GameRoom | null): CharacterState[] {
    return (
      room?.players.find((p: Player) => p.id !== this.myPlayerId)?.selectedCharacters || []
    );
  }

  isMyTurn(room: GameRoom): boolean {
    return room.currentTurn.playerId === this.myPlayerId;
  }

  getSelectedCharacterSkills(room: GameRoom, playerId: string): CharacterState[] {
    const player = room?.players.find((p: Player) => p.id === playerId);
    return player?.selectedCharacters || [];
  }

  leave() {
    this.game.leaveGame();
    this.game.fetchRooms();
    this.game.connect();
  }
}
