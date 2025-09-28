// src/services/MultiplierCalculator.ts
import { ParlayRequest, BetType } from "../types";

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
  // PrizePicks official multipliers
  private static POWER_MULTIPLIERS: Record<number, number> = {
    2: 3.0,
    3: 6.0,
    4: 10.0,
    5: 20.0,
    6: 37.5,
  };

  private static FLEX_MULTIPLIERS: Record<number, Record<number, number>> = {
    3: { 3: 4.0, 2: 2.0 },
    4: { 4: 10.0, 3: 1.5 },
    5: { 5: 20.0, 4: 2.0 },
    6: { 6: 25.0, 5: 2.0 },
  };

  /**
   * Calculate the payout multiplier for a parlay
   * - Flex: partial win possible (e.g. 4/6 still pays)
   * - Power: must hit all legs
   */
  static calculateMultiplier(
    parlays: ParlayRequest[],
    hits: number
  ): MultiplierCalculationResult {
    if (parlays.length === 0) {
      return {
        multiplier: 0,
        breakdown: {
          flexMultiplier: 0,
          powerMultiplier: 0,
          flexHits: 0,
          powerHits: 0,
          totalFlexBets: 0,
          totalPowerBets: 0,
          details: ["No parlays provided"],
        },
      };
    }

    const betType = parlays[0].betType; // assume one type per parlay
    const totalBets = parlays.length;

    let multiplier = 0;
    const details: string[] = [];

    if (betType === "flex") {
      multiplier = this.calculateFlexMultiplier(totalBets, hits);
      details.push(`Flex Play: ${hits}/${totalBets} → x${multiplier}`);
    } else {
      multiplier =
        hits === totalBets ? this.calculatePowerMultiplier(totalBets) : 0;
      details.push(`Power Play: ${hits}/${totalBets} → x${multiplier}`);
    }

    return {
      multiplier,
      breakdown: {
        flexMultiplier: betType === "flex" ? multiplier : 0,
        powerMultiplier: betType === "power" ? multiplier : 0,
        flexHits: betType === "flex" ? hits : 0,
        powerHits: betType === "power" ? hits : 0,
        totalFlexBets: betType === "flex" ? totalBets : 0,
        totalPowerBets: betType === "power" ? totalBets : 0,
        details,
      },
    };
  }

  /** Power Play multipliers */
  private static calculatePowerMultiplier(pickCount: number): number {
    return this.POWER_MULTIPLIERS[pickCount] || 0;
  }

  /** Flex Play multipliers */
  private static calculateFlexMultiplier(
    pickCount: number,
    hits: number
  ): number {
    return this.FLEX_MULTIPLIERS[pickCount]?.[hits] || 0;
  }

  /** Single bet type calc helper */
  static calculateSingleTypeMultiplier(
    betType: BetType,
    totalBets: number,
    hits: number
  ): number {
    if (betType === "flex") {
      return this.calculateFlexMultiplier(totalBets, hits);
    }
    return hits === totalBets ? this.calculatePowerMultiplier(totalBets) : 0;
  }

  /** Expected Value calculator (given hit probability per leg) */
  static calculateExpectedValue(
    betType: BetType,
    totalBets: number,
    hitProbability: number,
    stake: number
  ): number {
    let ev = 0;
    if (betType === "flex") {
      const outcomes = this.FLEX_MULTIPLIERS[totalBets];
      if (!outcomes) return 0;

      for (const hitsStr in outcomes) {
        const h = parseInt(hitsStr);
        const prob = this.binomialProb(totalBets, h, hitProbability);
        ev += prob * outcomes[h] * stake;
      }
    } else {
      // Power play: only pays if all hit
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

  /** Validate configuration */
  static validateParlayConfiguration(parlays: ParlayRequest[]) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (parlays.length === 0) errors.push("At least one parlay is required");
    if (parlays.length > 6) errors.push("Maximum 6 parlays allowed");

    const betType = parlays[0]?.betType;

    if (betType === "flex" && (parlays.length < 3 || parlays.length > 6)) {
      errors.push("Flex requires 3–6 picks");
    }
    if (betType === "power" && (parlays.length < 2 || parlays.length > 6)) {
      errors.push("Power requires 2–6 picks");
    }

    if (betType === "power" && parlays.length >= 5) {
      warnings.push("High number of power bets: very risky");
    }
    if (betType === "flex" && parlays.length >= 5) {
      warnings.push("High number of flex bets: risk/reward tradeoff");
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}