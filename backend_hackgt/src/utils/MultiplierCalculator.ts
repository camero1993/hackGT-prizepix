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
  // Power Play multipliers: all must hit
  private static POWER_MULTIPLIERS: Record<number, number> = {
    2: 3.0,
    3: 6.0,
    4: 10.0,
    5: 20.0,
    6: 37.5,
  };

  // Flex Play multipliers (supports partial wins)
  private static FLEX_MULTIPLIERS: Record<number, Record<number, number>> = {
    3: { 3: 4.0, 2: 2.0 },                // 3-pick flex
    4: { 4: 10.0, 3: 1.5, 2: 0 },         // 4-pick flex
    5: { 5: 20.0, 4: 2.0, 3: 0.4 },       // 5-pick flex
    6: { 6: 25.0, 5: 2.0, 4: 0.4, 3: 0 }, // 6-pick flex
  };

  /**
   * Calculate final multiplier combining flex + power
   */
  static calculateMultiplier(
    parlays: ParlayRequest[],
    flexHits: number,
    powerHits: number,
    allHits: boolean
  ): MultiplierCalculationResult {
    const flexBets = parlays.filter((p) => p.betType === "flex");
    const powerBets = parlays.filter((p) => p.betType === "power");

    let flexMultiplier = 0;
    let powerMultiplier = 0;
    const details: string[] = [];

    // ✅ Flex payout (partial wins allowed)
    if (flexBets.length > 0) {
      flexMultiplier = this.calculateFlexMultiplier(flexBets.length, flexHits);
      details.push(`Flex: ${flexHits}/${flexBets.length} → x${flexMultiplier}`);
    }

    // ✅ Power payout (all or nothing)
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
        details,
      },
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
}