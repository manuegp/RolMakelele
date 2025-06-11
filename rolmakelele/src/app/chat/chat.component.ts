import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../services/game.service';
import { ChatMessageReceivedData } from '../models/socket.types';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit {
  messages: ChatMessageReceivedData[] = [];
  newMessage = '';
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  constructor(private game: GameService) {}

  ngOnInit() {
    this.game.chatMessages$.subscribe(m => {
      this.messages = m;
      setTimeout(() => {
        if (this.messagesContainer) {
          const el = this.messagesContainer.nativeElement;
          el.scrollTop = el.scrollHeight;
        }
      });
    });
  }

  send() {
    const msg = this.newMessage.trim();
    if (msg) {
      this.game.sendChatMessage(msg);
      this.newMessage = '';
    }
  }
}
