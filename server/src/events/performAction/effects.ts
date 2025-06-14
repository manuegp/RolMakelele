import { Server } from "socket.io";
import {
  GameRoom,
  Player,
  CharacterState,
  Ability,
  ActionResult
} from "../../types/game.types";
import { ServerEvents } from "../../types/socket.types";
import {
  applyBuff,
  applyDebuff,
  applyHeal
} from "./utils/effects";
import { calculateDamage } from "./utils/damage";

export function applyAbilityEffects(
  io: Server,
  playerRoom: GameRoom,
  sourcePlayer: Player,
  targetPlayer: Player,
  sourceCharacter: CharacterState,
  targetCharacter: CharacterState,
  ability: Ability,
  actionResult: ActionResult
) {
  for (const effect of ability.effects) {
    if (effect.target === 'self') {
      if (effect.type === 'buff') {
        applyBuff(sourceCharacter, effect, actionResult, 'source');
      } else if (effect.type === 'heal') {
        applyHeal(sourceCharacter, effect, actionResult, 'source');
      } else if (effect.type === 'debuff') {
        applyDebuff(sourceCharacter, effect, actionResult, 'source');
      }
    } else if (effect.target === 'opponent') {
      if (effect.type === 'damage') {
        const evasionChance = targetCharacter.currentStats?.evasion || 0;
        if (Math.random() < evasionChance / 100) {
          actionResult.effects.push({ type: 'damage', target: 'target', value: 0 });
          io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
            username: 'Sistema',
            message: `${targetPlayer.username} - ${targetCharacter.name} esquivó el ataque`,
            timestamp: new Date(),
            isSpectator: false,
            isSystem: true
          });
          continue;
        }

        const { amount, attackPortion, reduction, isCrit } = calculateDamage(
          ability,
          effect.value,
          effect.ignoreDefense,
          sourceCharacter,
          targetCharacter
        );

        targetCharacter.currentHealth -= amount;
        if (targetCharacter.currentHealth <= 0) {
          targetCharacter.currentHealth = 0;
          targetCharacter.isAlive = false;
          actionResult.isDead = true;
        }

        actionResult.effects.push({ type: 'damage', target: 'target', value: amount });

        const calcParts = [`Base ${effect.value}%`];
        if (attackPortion) calcParts.push(`Atk ${attackPortion.toFixed(2)}`);
        if (reduction) calcParts.push(`- Def ${reduction.toFixed(2)}`);
        if (isCrit) calcParts.push('x2 Crit');
        const calcString = calcParts.join(' ');

        io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
          username: 'Sistema',
          message: `${sourcePlayer.username} - ${sourceCharacter.name} causó ${amount.toFixed(2)} de daño a ${targetPlayer.username} - ${targetCharacter.name}`,
          tooltip: calcString,
          timestamp: new Date(),
          isSpectator: false,
          isSystem: true
        });
      } else if (effect.type === 'debuff') {
        applyDebuff(targetCharacter, effect, actionResult, 'target');
      } else if (effect.type === 'heal') {
        applyHeal(targetCharacter, effect, actionResult, 'target');
      } else if (effect.type === 'buff') {
        applyBuff(targetCharacter, effect, actionResult, 'target');
      }
    }
  }
}

