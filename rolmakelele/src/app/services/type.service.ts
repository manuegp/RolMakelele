import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CharacterType } from '../models/game.types';

@Injectable({ providedIn: 'root' })
export class TypeService {
  private map = new Map<string, CharacterType>();

  constructor(private http: HttpClient) {
    this.http.get<CharacterType[]>('character.types.json').subscribe(types => {
      types.forEach(t => this.map.set(t.name, t));
    });
  }

  getColor(name: string | undefined): string {
    if (!name) return '#999';
    return this.map.get(name)?.color || '#999';
  }
}
