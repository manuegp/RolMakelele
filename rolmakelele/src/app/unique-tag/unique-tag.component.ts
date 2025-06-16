import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatChip } from '@angular/material/chips';

@Component({
  selector: 'app-unique-tag',
  standalone: true,
  imports: [MatChip],
  templateUrl: './unique-tag.component.html',
  styleUrl: './unique-tag.component.scss'
})
export class UniqueTagComponent implements OnInit, OnDestroy {
  @ViewChild(MatChip) chip!: MatChip;

  protected color = '';
  private hue = 0;
  private intervalId: any;

  ngOnInit(): void {
    this.startChangingColors();
  }

  startChangingColors() {
    this.intervalId = setInterval(() => {
      this.color = `hsl(${this.hue}, 100%, 50%)`; // Color en formato HSL
      this.hue = (this.hue + 1) % 360; // Incrementa el matiz y vuelve a 0 al pasar 360
    }, 20); // Cambia el color cada 50 ms
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId); // Limpia el intervalo al destruir el componente
  }
}
