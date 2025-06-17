import { CharacterState, Effect, ActionResult, StatType, StatusCondition } from '../../../types/game.types';

export function updateStatStage(character: CharacterState, stat: StatType, delta: number): number {
  if (!character.statStages) {
    character.statStages = {
      speed: 0,
      health: 0,
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      critical: 0,
      evasion: 0
    };
  }
  if (!character.currentStats) {
    character.currentStats = { ...character.stats };
  }
  const current = character.statStages[stat] || 0;
  const newStage = Math.max(-6, Math.min(6, current + delta));
  const appliedDelta = newStage - current;
  character.statStages[stat] = newStage;
  const base = character.stats[stat];
  const modified = Math.max(1, base * (1 + 0.5 * newStage));
  character.currentStats[stat] = modified;
  return appliedDelta;
}

export function applyBuff(
  character: CharacterState,
  effect: Effect,
  result: ActionResult,
  target: 'source' | 'target'
) {
  if (effect.stat) {
    const applied = updateStatStage(character, effect.stat, effect.value);
    if (!character.activeEffects) {
      character.activeEffects = [];
    }
    const storedEffect = { ...effect, value: applied };
    character.activeEffects.push({
      effect: storedEffect,
      remainingDuration: Number.POSITIVE_INFINITY
    });
    result.effects.push({
      type: 'buff',
      target,
      stat: effect.stat,
      value: applied,
      duration: Number.POSITIVE_INFINITY
    });
  }
}

export function applyDebuff(
  character: CharacterState,
  effect: Effect,
  result: ActionResult,
  target: 'source' | 'target'
) {
  if (effect.stat) {
    const applied = updateStatStage(character, effect.stat, effect.value);
    if (!character.activeEffects) {
      character.activeEffects = [];
    }
    const storedEffect = { ...effect, value: applied };
    character.activeEffects.push({
      effect: storedEffect,
      remainingDuration: Number.POSITIVE_INFINITY
    });
    result.effects.push({
      type: 'debuff',
      target,
      stat: effect.stat,
      value: applied,
      duration: Number.POSITIVE_INFINITY
    });
  }
}

export function applyHeal(
  character: CharacterState,
  effect: Effect,
  result: ActionResult,
  target: 'source' | 'target'
) {
  let healAmount = effect.value;
  if (effect.healLost) {
    healAmount += character.stats.health - character.currentHealth;
  }
  character.currentHealth = Math.min(
    character.currentHealth + healAmount,
    character.stats.health
  );
  result.effects.push({ type: 'heal', target, value: healAmount });
}

export function applyCure(
  character: CharacterState,
  status: StatusCondition | null,
  result: ActionResult,
  target: 'source' | 'target'
) {
  if (!status || character.status === status) {
    removeStatus(character, result.effects, target);
  }
}

export function applyStatus(character: CharacterState, status: StatusCondition, result: ActionResult, target: 'source' | 'target') {
  if (!character.status) {
    character.status = status;
    character.statusTurns = 0;
    if (!character.currentStats) {
      character.currentStats = { ...character.stats };
    }
    if (status === 'burn') {
      character.currentStats.attack *= 0.5;
    } else if (status === 'paralysis') {
      character.currentStats.speed *= 0.5;
    }
    result.effects.push({ type: 'status', target, value: 0, status });
  }
}

export function removeStatus(
  character: CharacterState,
  effects?: ActionResult['effects'],
  target: 'source' | 'target' = 'source'
) {
  if (character.status) {
    if (character.status === 'burn') {
      character.currentStats!.attack = character.stats.attack;
    } else if (character.status === 'paralysis') {
      character.currentStats!.speed = character.stats.speed;
    }
    if (effects) {
      effects.push({ type: 'status', target, value: 0, status: null });
    }
    character.status = undefined;
    character.statusTurns = 0;
  }
}
