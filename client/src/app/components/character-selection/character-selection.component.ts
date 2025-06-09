import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';

interface Character {
  id: string;
  name: string;
}

@Component({
  selector: 'app-character-selection',
  templateUrl: './character-selection.component.html'
})
export class CharacterSelectionComponent implements OnInit {
  username = '';
  characters: Character[] = [];
  selected: Set<string> = new Set();
  socket!: Socket;

  ngOnInit(): void {
    this.socket = io('http://localhost:3001');
    this.socket.on('characters_list', (data: any) => {
      this.characters = data.characters;
    });
  }

  toggle(id: string): void {
    if (this.selected.has(id)) {
      this.selected.delete(id);
    } else {
      if (this.selected.size < 4) {
        this.selected.add(id);
      }
    }
  }

  continue(): void {
    if (this.username && this.selected.size === 4) {
      localStorage.setItem('username', this.username);
      localStorage.setItem('characters', JSON.stringify(Array.from(this.selected)));
      this.socket.disconnect();
      this.router.navigate(['/rooms']);
    }
  }

  constructor(private router: Router) {}
}
