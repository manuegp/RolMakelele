import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'select', pathMatch: 'full' },
  {
    path: 'select',
    loadComponent: () =>
      import('./character-selection/character-selection.component').then(m => m.CharacterSelectionComponent)
  },
  {
    path: 'rooms',
    loadComponent: () => import('./rooms/rooms.component').then(m => m.RoomsComponent)
  },
  {
    path: 'combat/:roomId',
    loadComponent: () => import('./combat/combat.component').then(m => m.CombatComponent)
  }
];
