import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameService } from '../services/game.service';

export const redirectIfInGameGuard: CanActivateFn = () => {
  const game = inject(GameService);
  const router = inject(Router);
  return game.isInGame()
    ? router.createUrlTree(['/combat', game.getCurrentRoomId()!])
    : true;
};
