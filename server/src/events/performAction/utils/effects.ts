import { CharacterState, Effect, ActionResult } from '../../../types/game.types';

export function applyBuff(character: CharacterState, effect: Effect, result: ActionResult, target: 'source' | 'target') {
  if (effect.stat && character.currentStats) {
    const statValue = (character.currentStats[effect.stat] || 0) + effect.value;
    character.currentStats[effect.stat] = statValue;
    if (effect.duration && effect.duration > 0) {
      if (!character.activeEffects) {
        character.activeEffects = [];
      }
      character.activeEffects.push({ effect, remainingDuration: effect.duration });
    }
    result.effects.push({ type: 'buff', target, stat: effect.stat, value: effect.value, duration: effect.duration });
  }
}

export function applyDebuff(character: CharacterState, effect: Effect, result: ActionResult, target: 'source' | 'target') {
  if (effect.stat && character.currentStats) {
    const statValue = (character.currentStats[effect.stat] || 0) + effect.value;
    character.currentStats[effect.stat] = target === 'target' ? Math.max(1, statValue) : statValue;
    if (effect.duration && effect.duration > 0) {
      if (!character.activeEffects) {
        character.activeEffects = [];
      }
      character.activeEffects.push({ effect, remainingDuration: effect.duration });
    }
    result.effects.push({ type: 'debuff', target, stat: effect.stat, value: effect.value, duration: effect.duration });
  }
}

export function applyHeal(character: CharacterState, effect: Effect, result: ActionResult, target: 'source' | 'target') {
  const healAmount = effect.value;
  character.currentHealth = Math.min(character.currentHealth + healAmount, character.stats.health);
  result.effects.push({ type: 'heal', target, value: healAmount });
}
