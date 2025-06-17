import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../services/game.service';
import { ChatMessageReceivedData } from '../models/socket.types';
import { NgxTooltip } from '@ngx-popovers/tooltip';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { STATUS_COLORS, STATUS_LABELS } from '../constants/statuses.map';
import { StatusCondition } from '../models/game.types';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxTooltip],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit {
  messages: ChatMessageReceivedData[] = [];
  newMessage = '';
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  readonly statusLabels = STATUS_LABELS;
  readonly statusColors = STATUS_COLORS;

  constructor(private game: GameService, private sanitizer: DomSanitizer) {}

  formatMessage(msg: ChatMessageReceivedData): SafeHtml {
    let text = msg.message;
    for (const key of Object.keys(this.statusLabels) as StatusCondition[]) {
      const label = this.statusLabels[key];
      const color = this.statusColors[key];
      const regex = new RegExp(label, 'gi');
      text = text.replace(regex, `<span style="color: ${color}">${label}</span>`);
    }
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }

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
