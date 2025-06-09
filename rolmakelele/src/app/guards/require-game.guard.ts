import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { GameService } from '../services/game.service';

export const requireGameGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const game = inject(GameService);
  const router = inject(Router);
  const current = game.getCurrentRoomId();
  if (!current) {
    return router.createUrlTree(['/rooms']);
  }

  const exists = await game.roomExists(current);
  if (!exists) {
    game.clearRoom();
    return router.createUrlTree(['/rooms']);
  }

  const roomId = route.paramMap.get('roomId');
  if (roomId !== current) {
    return router.createUrlTree(['/combat', current]);
  }
  return true;
};
