import { Component, Input, OnInit } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Stats } from '../models/game.types';
import { ChartOptions } from 'chart.js';
import { LABELS_MAP } from '../constants/stats.map';
@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [BaseChartDirective],
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss',
})

export class ChartComponent implements OnInit {
  @Input({ required: true }) public data!: Stats;

  public chartData!: {
    labels: string[];
    datasets: { data: number[]; label: string }[];
  };

  public chartOptions: ChartOptions<'radar'> = {
    responsive: true,
    scales: {
      r: {
        // Oculta las etiquetas alrededor del radar
        pointLabels: {
          display: false
        },
        // Oculta los números (ticks) en el centro
        ticks: {
          display: false
        },
        max: 255
      }
    },
    plugins: {
      // Si también quisieras quitar la leyenda (nombre del dataset):
      legend: {
        display: false
      }
    }
  };

  ngOnInit(): void {
    const rawKeys = Object.keys(this.data);
    const values = Object.values(this.data) as number[];

    const displayLabels = rawKeys.map(key => LABELS_MAP[key] ?? key);
    
    this.chartData = {
      labels: displayLabels,
      datasets: [
        { data: values, label: 'Stats' }
      ]
    };
  }
}
