import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GameService } from '../services/game.service';

export const requireUsernameGuard: CanActivateFn = () => {
  const game = inject(GameService);
  const router = inject(Router);
  return game.hasUsername() ? true : router.createUrlTree(['/name']);
};
