import { Server } from "socket.io";
import {
  GameRoom,
  Player,
  CharacterState,
  Ability,
  Effect,
  ActionResult
} from "../../types/game.types";
import { ServerEvents } from "../../types/socket.types";
import {
  applyBuff,
  applyDebuff,
  applyHeal,
  applyStatus,
  applyCure
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
  const sameType =
    ability.type && sourceCharacter.types?.some(t => t.name === ability.type);

  function processEffect(effect: Effect) {
    if (Math.random() > (effect.chance ?? 1)) {
      return;
    }
    const modifiedEffect = {
      ...effect,
      value: effect.value * (sameType ? 1.2 : 1)
    };
    const statusRoll =
      effect.type === 'status' && effect.status
        ? Math.random() < (effect.statusChance ?? 1)
        : false;
    if (effect.target === 'self') {
      if (effect.type === 'buff') {
        applyBuff(sourceCharacter, modifiedEffect, actionResult, 'source');
      } else if (effect.type === 'heal') {
        applyHeal(sourceCharacter, modifiedEffect, actionResult, 'source');
      } else if (effect.type === 'debuff') {
        applyDebuff(sourceCharacter, modifiedEffect, actionResult, 'source');
      } else if (effect.type === 'cure') {
        applyCure(sourceCharacter, effect.status ?? null, actionResult, 'source');
      }
      if (statusRoll && effect.status) {
        applyStatus(sourceCharacter, effect.status, actionResult, 'source');
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
          return;
        }

        const { amount, attackPortion, reduction, isCrit } = calculateDamage(
          ability,
          modifiedEffect.value,
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

        const calcParts = [`Base ${modifiedEffect.value}%`];
        if (attackPortion) calcParts.push(`Atk ${Math.round(attackPortion)}`);
        if (reduction) calcParts.push(`- Def ${Math.round(reduction)}`);
        if (
          ability.category === 'physical' &&
          sourceCharacter.status === 'burn'
        ) {
          calcParts.push('Quemado x0.5');
        }
        if (isCrit) calcParts.push('x2 Crit');
        const calcString = calcParts.join(' ');

        io.to(playerRoom.id).emit(ServerEvents.CHAT_MESSAGE, {
          username: 'Sistema',
          message: `${sourcePlayer.username} - ${sourceCharacter.name} causó ${amount} de daño a ${targetPlayer.username} - ${targetCharacter.name}`,
          tooltip: calcString,
          timestamp: new Date(),
          isSpectator: false,
          isSystem: true
        });
      } else if (effect.type === 'debuff') {
        applyDebuff(targetCharacter, modifiedEffect, actionResult, 'target');
      } else if (effect.type === 'heal') {
        applyHeal(targetCharacter, modifiedEffect, actionResult, 'target');
      } else if (effect.type === 'buff') {
        applyBuff(targetCharacter, modifiedEffect, actionResult, 'target');
      } else if (effect.type === 'cure') {
        applyCure(targetCharacter, effect.status ?? null, actionResult, 'target');
      }
      if (statusRoll && effect.status) {
        applyStatus(targetCharacter, effect.status, actionResult, 'target');
      }
    } else if (effect.target === 'allies') {
      for (const ally of sourcePlayer.selectedCharacters) {
        if (!ally.isAlive) continue;
        if (effect.type === 'buff') {
          applyBuff(ally, modifiedEffect, actionResult, 'target');
        } else if (effect.type === 'heal') {
          applyHeal(ally, modifiedEffect, actionResult, 'target');
        } else if (effect.type === 'debuff') {
          applyDebuff(ally, modifiedEffect, actionResult, 'target');
        } else if (effect.type === 'cure') {
          applyCure(ally, effect.status ?? null, actionResult, 'target');
        }
        if (statusRoll && effect.status) {
          applyStatus(ally, effect.status, actionResult, 'target');
        }
      }
    }
  }

  ability.effects.forEach(processEffect);
  ability.extraEffects?.forEach(processEffect);
}

