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
  @Input() public maxValue?: number;

  public chartData!: {
    labels: string[];
    datasets: { data: number[]; label: string }[];
  };

  public chartOptions: ChartOptions<'radar'> = {
    responsive: true,
    scales: {
      r: {
        max: 0,
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
    const rawKeys = Object.keys(this.data) as (keyof Stats)[];
    const values = rawKeys.map(key => this.data[key]);

    const computedMax = Math.max(...values);
    this.chartOptions.scales!['r']!.max = this.maxValue ?? computedMax;

    const displayLabels = rawKeys.map(key => LABELS_MAP[key] ?? key);
    
    this.chartData = {
      labels: displayLabels,
      datasets: [
        { data: values, label: 'Stats' }
      ]
    };
  }
}
