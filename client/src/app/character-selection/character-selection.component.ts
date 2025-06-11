import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { GameStateService } from '../services/game-state.service';

interface Character {
  id: string;
  name: string;
}

@Component({
  selector: 'app-character-selection',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './character-selection.component.html',
  styleUrls: ['./character-selection.component.scss']
})
export class CharacterSelectionComponent implements OnInit {
  characters: Character[] = [];
  selected: string[] = [];
  username = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private state: GameStateService
  ) {}

  ngOnInit(): void {
    this.http.get<{ characters: Character[] }>('/api/characters')
      .subscribe(res => this.characters = res.characters);
  }

  continue() {
    this.state.username = this.username;
    this.state.selectedCharacterIds = this.selected;
    this.router.navigate(['/rooms']);
  }
}
