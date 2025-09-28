// src/services/MultiplierCalculator.ts
import { ParlayRequest, BetType } from '../types';

export interface MultiplierCalculationResult {
  multiplier: number;
  breakdown: {
    flexMultiplier: number;
    powerMultiplier: number;
    flexHits: number;
    powerHits: number;
    totalFlexBets: number;
    totalPowerBets: number;
    details: string[];
  };
}

export class MultiplierCalculator {
  // Centralized config (easier to adjust later)
  private static POWER_MULTIPLIERS: Record<number, number> = {
    2: 3.0,
    3: 6.0,
    4: 10.0,
    5: 20.0,
    6: 37.5
  };

  private static FLEX_MULTIPLIERS: Record<number, Record<number, number>> = {
    3: { 3: 4.0, 2: 2.0 }, // PrizePicks official
    4: { 4: 10.0, 3: 1.5 },
    5: { 5: 20.0, 4: 2.0 },
    6: { 6: 25.0, 5: 2.0 }
  };

  /**
   * Calculate final multiplier combining flex + power
   */
  static calculateMultiplier(
    parlays: (ParlayRequest & { betType: 'flex' | 'power' })[],
    flexHits: number,
    powerHits: number,
    allHits: boolean
  ): MultiplierCalculationResult {
    const flexBets = parlays.filter((p) => p.betType === 'flex');
    const powerBets = parlays.filter((p) => p.betType === 'power');

    let flexMultiplier = 0;
    let powerMultiplier = 0;
    const details: string[] = [];

    if (flexBets.length > 0) {
      flexMultiplier = this.calculateFlexMultiplier(flexBets.length, flexHits);
      details.push(`Flex: ${flexHits}/${flexBets.length} → x${flexMultiplier}`);
    }

    if (powerBets.length > 0) {
      if (powerHits === powerBets.length && allHits) {
        powerMultiplier = this.calculatePowerMultiplier(powerBets.length);
        details.push(`Power: ${powerHits}/${powerBets.length} → x${powerMultiplier}`);
      } else {
        details.push(`Power: Missed (${powerHits}/${powerBets.length}) → x0`);
      }
    }

    return {
      multiplier: flexMultiplier + powerMultiplier,
      breakdown: {
        flexMultiplier,
        powerMultiplier,
        flexHits,
        powerHits,
        totalFlexBets: flexBets.length,
        totalPowerBets: powerBets.length,
        details
      }
    };
  }

  /** Power Play multipliers */
  private static calculatePowerMultiplier(pickCount: number): number {
    return this.POWER_MULTIPLIERS[pickCount] || 0;
  }

  /** Flex Play multipliers */
  private static calculateFlexMultiplier(pickCount: number, hits: number): number {
    return this.FLEX_MULTIPLIERS[pickCount]?.[hits] || 0;
  }

  /** Single bet type calc */
  static calculateSingleTypeMultiplier(betType: BetType, totalBets: number, hits: number): number {
    if (betType === 'flex') {
      return this.calculateFlexMultiplier(totalBets, hits);
    }
    return hits === totalBets ? this.calculatePowerMultiplier(totalBets) : 0;
  }

  /** EV calculator: expected return given hit probability */
  static calculateExpectedValue(
    betType: BetType,
    totalBets: number,
    hitProbability: number,
    stake: number
  ): number {
    let ev = 0;
    if (betType === 'flex') {
      const outcomes = this.FLEX_MULTIPLIERS[totalBets];
      if (!outcomes) return 0;
      for (const hits in outcomes) {
        const h = parseInt(hits);
        const prob = this.binomialProb(totalBets, h, hitProbability);
        ev += prob * outcomes[h] * stake;
      }
    } else {
      // Power play
      const prob = Math.pow(hitProbability, totalBets);
      ev = prob * this.calculatePowerMultiplier(totalBets) * stake;
    }
    return ev;
  }

  /** Binomial probability helper */
  private static binomialProb(n: number, k: number, p: number): number {
    const comb = (n: number, k: number): number => {
      if (k === 0 || k === n) return 1;
      if (k === 1) return n;
      return comb(n - 1, k - 1) + comb(n - 1, k);
    };
    return comb(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  /** Validate bets */
  static validateParlayConfiguration(parlays: ParlayRequest[], betType: 'flex' | 'power') {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (parlays.length === 0) errors.push('At least one parlay is required');
    if (parlays.length > 6) errors.push('Maximum 6 parlays allowed');

    const flexBets = betType === 'flex' ? parlays : [];
    const powerBets = betType === 'power' ? parlays : [];

    if (flexBets.length > 0 && (flexBets.length < 3 || flexBets.length > 6)) {
      errors.push('Flex requires 3–6 picks');
    }
    if (powerBets.length > 0 && (powerBets.length < 2 || powerBets.length > 6)) {
      errors.push('Power requires 2–6 picks');
    }

    if (flexBets.length > 0 && powerBets.length > 0) {
      warnings.push('Mixed bets: all Power legs must hit for any payout');
    }
    if (powerBets.length >= 5) warnings.push('High number of power bets: very risky');
    if (flexBets.length >= 5) warnings.push('High number of flex bets: risk/reward tradeoff');

    return { isValid: errors.length === 0, errors, warnings };
  }
}