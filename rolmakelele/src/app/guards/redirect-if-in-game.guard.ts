import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameService } from '../services/game.service';

export const redirectIfInGameGuard: CanActivateFn = async () => {
  const game = inject(GameService);
  const router = inject(Router);
  const current = game.getCurrentRoomId();
  if (current) {
    const exists = await game.roomExists(current);
    if (exists) {
      return router.createUrlTree(['/combat', current]);
    }
    game.clearRoom();
  }
  return true;
};
