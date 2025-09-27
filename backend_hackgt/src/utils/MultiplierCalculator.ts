import { Parlay, ParlayRequest, BetType } from '../types';

export interface MultiplierCalculationResult {
  multiplier: number;
  breakdown: {
    flexMultiplier: number;
    powerMultiplier: number;
    flexHits: number;
    powerHits: number;
    totalFlexBets: number;
    totalPowerBets: number;
  };
}

export class MultiplierCalculator {
  /**
   * Calculate multiplier based on actual PrizePicks multiplier structure
   * Power Play: All must hit for payout
   * Flex Play: Partial payouts for partial hits
   */
  static calculateMultiplier(
    parlays: ParlayRequest[], 
    flexHits: number, 
    powerHits: number, 
    allHits: boolean
  ): MultiplierCalculationResult {
    const flexBets = parlays.filter(p => p.betType === 'flex');
    const powerBets = parlays.filter(p => p.betType === 'power');
    
    let flexMultiplier = 0;
    let powerMultiplier = 0;
    
    // Calculate flex multiplier using actual PrizePicks structure
    if (flexBets.length > 0) {
      flexMultiplier = this.calculateFlexMultiplier(flexBets.length, flexHits);
    }
    
    // Calculate power multiplier using actual PrizePicks structure
    if (powerBets.length > 0) {
      if (powerHits === powerBets.length && allHits) {
        // All power bets hit
        powerMultiplier = this.calculatePowerMultiplier(powerBets.length);
      } else {
        // Any power bet missed = no payout
        powerMultiplier = 0;
      }
    }
    
    // Total multiplier is the sum of flex and power multipliers
    const totalMultiplier = flexMultiplier + powerMultiplier;
    
    return {
      multiplier: totalMultiplier,
      breakdown: {
        flexMultiplier,
        powerMultiplier,
        flexHits,
        powerHits,
        totalFlexBets: flexBets.length,
        totalPowerBets: powerBets.length
      }
    };
  }

  /**
   * Calculate Power Play multiplier based on actual PrizePicks structure
   * 2-pick: 3x, 3-pick: 6x, 4-pick: 10x, 5-pick: 20x, 6-pick: 37.5x
   */
  private static calculatePowerMultiplier(pickCount: number): number {
    const powerMultipliers: { [key: number]: number } = {
      2: 3.0,
      3: 6.0,
      4: 10.0,
      5: 20.0,
      6: 37.5
    };
    
    return powerMultipliers[pickCount] || 0;
  }

  /**
   * Calculate Flex Play multiplier based on actual PrizePicks structure
   * 3-pick: 3/3 = 4x, 2/3 = 2x ,1/3 = 0x(push to entry)
   * 4-pick: 4/4 = 8x, 3/4 = 3x, 1/4 = 0.5x
   * 5-pick: 5/5 = 20x, 4/5 = 12x, 1/5 = 0.2x
   * 6-pick: 6/6 = 35x, 5/6 = 20x, 
   */
  private static calculateFlexMultiplier(pickCount: number, hits: number): number {
    const flexMultipliers: { [key: number]: { [key: number]: number } } = {
      3: { 3: 3.0, 2: 1.0 },
      4: { 4: 6.0, 3: 1.5 },
      5: { 5: 10.0, 4: 2.0, 3: 0.4 },
      6: { 6: 25.0, 5: 2.0, 4: 0.4 }
    };
    
    const pickMultipliers = flexMultipliers[pickCount];
    if (!pickMultipliers) {
      return 0; // Unsupported pick count
    }
    
    return pickMultipliers[hits] || 0;
  }

  /**
   * Calculate multiplier for a single bet type scenario using actual PrizePicks structure
   */
  static calculateSingleTypeMultiplier(
    betType: BetType,
    totalBets: number,
    hits: number
  ): number {
    if (betType === 'flex') {
      return this.calculateFlexMultiplier(totalBets, hits);
    } else { // power
      if (hits === totalBets) {
        return this.calculatePowerMultiplier(totalBets);
      } else {
        return 0; // Any miss = no payout
      }
    }
  }

  /**
   * Get expected multiplier for a given hit rate and bet type
   */
  static getExpectedMultiplier(
    betType: BetType,
    totalBets: number,
    expectedHitRate: number
  ): number {
    const expectedHits = Math.floor(totalBets * expectedHitRate);
    return this.calculateSingleTypeMultiplier(betType, totalBets, expectedHits);
  }

  /**
   * Get payout examples for different scenarios using actual PrizePicks structure
   */
  static getPayoutExamples(): Array<{
    scenario: string;
    betType: BetType;
    totalBets: number;
    hits: number;
    multiplier: number;
    payout: number;
  }> {
    const examples: Array<{
      scenario: string;
      betType: BetType;
      totalBets: number;
      hits: number;
      multiplier: number;
      payout: number;
    }> = [];
    const betAmount = 100;
    
    // Flex examples (3-6 picks only)
    const flexPickCounts = [3, 4, 5, 6];
    for (const total of flexPickCounts) {
      for (let hits = 2; hits <= total; hits++) {
        const multiplier = this.calculateSingleTypeMultiplier('flex', total, hits);
        if (multiplier > 0) {
          examples.push({
            scenario: `${hits}/${total} Flex`,
            betType: 'flex' as BetType,
            totalBets: total,
            hits,
            multiplier,
            payout: betAmount * multiplier
          });
        }
      }
    }
    
    // Power examples (2-6 picks only)
    const powerPickCounts = [2, 3, 4, 5, 6];
    for (const total of powerPickCounts) {
      const multiplier = this.calculateSingleTypeMultiplier('power', total, total);
      examples.push({
        scenario: `${total}/${total} Power`,
        betType: 'power' as BetType,
        totalBets: total,
        hits: total,
        multiplier,
        payout: betAmount * multiplier
      });
    }
    
    return examples;
  }

  /**
   * Validate parlay configuration based on PrizePicks rules
   */
  static validateParlayConfiguration(parlays: ParlayRequest[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (parlays.length === 0) {
      errors.push('At least one parlay is required');
    }
    
    if (parlays.length > 6) {
      errors.push('Maximum 6 parlays allowed (PrizePicks limit)');
    }
    
    const flexBets = parlays.filter(p => p.betType === 'flex');
    const powerBets = parlays.filter(p => p.betType === 'power');
    
    // Validate flex bets
    if (flexBets.length > 0) {
      if (flexBets.length < 3) {
        errors.push('Flex bets require minimum 3 picks');
      }
      if (flexBets.length > 6) {
        errors.push('Flex bets maximum 6 picks');
      }
    }
    
    // Validate power bets
    if (powerBets.length > 0) {
      if (powerBets.length < 2) {
        errors.push('Power bets require minimum 2 picks');
      }
      if (powerBets.length > 6) {
        errors.push('Power bets maximum 6 picks');
      }
    }
    
    // Mixed bet type warnings
    if (flexBets.length > 0 && powerBets.length > 0) {
      warnings.push('Mixed bet types: Power bets must all hit for any payout');
    }
    
    // High risk warnings
    if (powerBets.length >= 5) {
      warnings.push('High number of power bets: Very low probability of success');
    }
    
    if (flexBets.length >= 5) {
      warnings.push('High number of flex bets: Consider the risk/reward ratio');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
