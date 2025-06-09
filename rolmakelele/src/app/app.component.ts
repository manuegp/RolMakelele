import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameService } from './services/game.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, FormsModule,CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'rolmakelele';
  username = '';

  constructor(public game: GameService) {}

  ngOnInit() {
    this.username = this.game.getUsername();
  }

  change() {
    if (this.username) {
      this.game.setUsername(this.username);
    }
  }
}
