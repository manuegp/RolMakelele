import { Routes } from '@angular/router';
import { CharacterSelectionComponent } from './character-selection/character-selection.component';
import { RoomListComponent } from './room-list/room-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'characters', pathMatch: 'full' },
  { path: 'characters', component: CharacterSelectionComponent },
  { path: 'rooms', component: RoomListComponent }
];
