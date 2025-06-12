import { Ability, CharacterState } from '../../../types/game.types';

export interface DamageCalculation {
  amount: number;
  attackPortion: number;
  reduction: number;
  isCrit: boolean;
}

export function calculateDamage(
  ability: Ability,
  basePercentage: number,
  ignoreDefense: number | undefined,
  source: CharacterState,
  target: CharacterState
): DamageCalculation {
  let damage = basePercentage;
  let attackPortion = 0;
  let reduction = 0;

  if (source.currentStats) {
    const isSpecial = ability.category === 'special';
    const attackStat = isSpecial ? source.currentStats.specialAttack : source.currentStats.attack;
    attackPortion = (attackStat * basePercentage) / 100;
    damage = attackPortion;
  }

  if (target.currentStats) {
    const isSpecial = ability.category === 'special';
    let defense = isSpecial ? target.currentStats.specialDefense : target.currentStats.defense;
    if (ignoreDefense) {
      defense *= 1 - ignoreDefense;
    }
    reduction = damage * (defense / 255);
    damage = Math.max(1, damage - reduction);
  }

  const critChance = source.currentStats?.critical || 0;
  const isCrit = Math.random() < critChance / 100;
  if (isCrit) {
    damage *= 2;
  }

  return { amount: damage, attackPortion, reduction, isCrit };
}
