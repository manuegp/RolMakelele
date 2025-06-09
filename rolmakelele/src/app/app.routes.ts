import { Routes } from '@angular/router';
import { redirectIfInGameGuard } from './guards/redirect-if-in-game.guard';
import { requireGameGuard } from './guards/require-game.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'select', pathMatch: 'full' },
  {
    path: 'select',
    canActivate: [redirectIfInGameGuard],
    loadComponent: () =>
      import('./character-selection/character-selection.component').then(m => m.CharacterSelectionComponent)
  },
  {
    path: 'rooms',
    canActivate: [redirectIfInGameGuard],
    loadComponent: () => import('./rooms/rooms.component').then(m => m.RoomsComponent)
  },
  {
    path: 'combat/:roomId',
    canActivate: [requireGameGuard],
    loadComponent: () => import('./combat/combat.component').then(m => m.CombatComponent)
  }
];
