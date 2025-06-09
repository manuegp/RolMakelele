import { Routes } from '@angular/router';
import { redirectIfInGameGuard } from './guards/redirect-if-in-game.guard';
import { requireGameGuard } from './guards/require-game.guard';
import { requireUsernameGuard } from './guards/require-username.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'name', pathMatch: 'full' },
  {
    path: 'name',
    loadComponent: () => import('./name/name.component').then(m => m.NameComponent)
  },
  {
    path: 'rooms',
    canActivate: [requireUsernameGuard, redirectIfInGameGuard],
    loadComponent: () => import('./rooms/rooms.component').then(m => m.RoomsComponent)
  },
  {
    path: 'characters/:roomId',
    canActivate: [requireUsernameGuard],
    loadComponent: () =>
      import('./character-selection/character-selection.component').then(m => m.CharacterSelectionComponent)
  },
  {
    path: 'combat/:roomId',
    canActivate: [requireUsernameGuard, requireGameGuard],
    loadComponent: () => import('./combat/combat.component').then(m => m.CombatComponent)
  }
];
