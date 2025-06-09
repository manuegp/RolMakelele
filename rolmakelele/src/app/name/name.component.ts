import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-name',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './name.component.html'
})
export class NameComponent implements OnInit {
  username = '';

  constructor(private game: GameService, private router: Router) {}

  ngOnInit() {
    if (this.game.hasUsername()) {
      this.router.navigate(['/rooms']);
    }
  }

  save() {
    if (this.username) {
      this.game.setUsername(this.username);
      this.router.navigate(['/rooms']);
    }
  }
}
