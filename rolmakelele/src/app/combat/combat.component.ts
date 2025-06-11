import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '../services/game.service';
import { Observable } from 'rxjs';
import { GameRoom, CharacterState, Ability } from '../models/game.types';
import { TurnStartedData } from '../models/socket.types';
import { CharacterBoxComponent } from './character-box/character-box.component';
import { ChatComponent } from '../chat/chat.component';

@Component({
  selector: 'app-combat',
  standalone: true,
  imports: [CommonModule, CharacterBoxComponent, ChatComponent],
  templateUrl: './combat.component.html',
  styleUrl: './combat.component.scss'
})
export class CombatComponent implements OnInit {
  roomId: string | null = null;
  room$!: Observable<GameRoom | null>;
  turn$!: Observable<TurnStartedData | null>;
  rows = [0, 1, 2, 3];

  selectingTarget = false;
  selectedAbilityIndex: number | null = null;
  targetOpponent = true;

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

  getCharacterName(
    room: GameRoom,
    playerId: string,
    characterIndex: number
  ): string {
    const player = room?.players.find(p => p.id === playerId);
    return player?.selectedCharacters?.[characterIndex]?.name || '';
  }

  getMyCharacters(room: GameRoom): CharacterState[] {
    return (
      room?.players.find(p => p.id === this.myPlayerId)?.selectedCharacters || []
    );
  }

  getOpponentCharacters(room: GameRoom): CharacterState[] {
    return (
      room?.players.find(p => p.id !== this.myPlayerId)?.selectedCharacters || []
    );
  }

  isMyTurn(room: GameRoom): boolean {
    return room.currentTurn?.playerId === this.myPlayerId;
  }

  getOpponentPlayerId(room: GameRoom): string {
    return room.players.find(p => p.id !== this.myPlayerId)?.id || '';
  }

  getCurrentCharacterAbilities(room: GameRoom): Ability[] {
    const turn = room.currentTurn;
    if (!turn) return [];
    const player = room.players.find(p => p.id === turn.playerId);
    return player?.selectedCharacters?.[turn.characterIndex]?.abilities || [];
  }

  startTargetSelection(index: number, ability: Ability) {
    this.selectedAbilityIndex = index;
    this.selectingTarget = true;
    this.targetOpponent = ability.effects.some(e => e.target === 'opponent');
  }

  cancelTargetSelection() {
    this.selectingTarget = false;
    this.selectedAbilityIndex = null;
  }

  isSelectableTarget(playerId: string): boolean {
    if (!this.selectingTarget) return false;
    return this.targetOpponent ? playerId !== this.myPlayerId : playerId === this.myPlayerId;
  }

  selectTarget(room: GameRoom, playerId: string, characterIndex: number) {
    if (!this.selectingTarget || this.selectedAbilityIndex === null) return;
    const turn = room.currentTurn;
    if (!turn || !this.myPlayerId) return;
    this.game.performAction({
      playerId: this.myPlayerId,
      sourceCharacterIndex: turn.characterIndex,
      targetPlayerId: playerId,
      targetCharacterIndex: characterIndex,
      abilityIndex: this.selectedAbilityIndex
    });
    this.cancelTargetSelection();
  }

  leave() {
    this.game.leaveGame();
    this.game.fetchRooms();
    this.game.connect();
  }
}
