import {
  ParlayRequest,
  StructuredParlayRequest,
  Contract,
  Parlay,
  Bet,
  SimulationRequestSchema,
  ParlaySchema,
  StatType,
  BetType,
} from "../types";

/**
 * This test suite verifies that our sample "contract creation" payloads
 * conform to the schemas and TypeScript interfaces defined in `src/types.ts`.
 *
 * We validate the request model with zod (SimulationRequestSchema / ParlaySchema)
 * and also assert that objects satisfy the TypeScript interfaces (Contract, Parlay, Bet)
 * for compile-time alignment.
 */

describe("Contract/Parlay/Bet schema alignment", () => {
  const playerA = "201939"; // Stephen Curry
  const playerB = "2544"; // LeBron James
  const playerC = "203999"; // Nikola Jokic

  const statA: StatType = "points";
  const statB: StatType = "rebounds";
  const statC: StatType = "assists";

  const betType: BetType = "flex"; // could also be "power"

  // Three-leg parlay request (API input shape)
  const leg1: ParlayRequest = { playerId: playerA, stat: statA, overUnder: "over" };
  const leg2: ParlayRequest = { playerId: playerB, stat: statB, overUnder: "under" };
  const leg3: ParlayRequest = { playerId: playerC, stat: statC, overUnder: "over" };

  const structuredParlay: StructuredParlayRequest = {
    legs: [leg1, leg2, leg3],
    betType,
    betAmount: 100,
  };

  test("Parlay legs validate against ParlaySchema (zod)", () => {
    // Validate each leg runtime shape with zod
    expect(() => ParlaySchema.parse(leg1)).not.toThrow();
    expect(() => ParlaySchema.parse(leg2)).not.toThrow();
    expect(() => ParlaySchema.parse(leg3)).not.toThrow();
  });

  test("SimulationRequest validates against SimulationRequestSchema (zod)", () => {
    const simulationRequest = {
      contract_length: 3,
      betType,
      parlays: [leg1, leg2, leg3],
    };

    const parsed = SimulationRequestSchema.safeParse(simulationRequest);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      // If it fails, surface detailed issues
      throw new Error(JSON.stringify(parsed.error.issues, null, 2));
    }
  });

  test("Example Bet/Parlay/Contract objects satisfy TypeScript interfaces", () => {
    // Example Bet objects (database model). Note: threshold/actual values here are placeholders.
    const bet1: Bet = {
      _id: "bet1",
      gameId: "game1",
      playerId: playerA,
      stat: statA,
      threshold: 29.5,
      overUnder: "over",
      betAmount: 100,
      multiplier: 3.0,
      potentialWinnings: 300,
      status: "pending",
      createdAt: new Date(),
      parlayId: "parlay1",
    };

    const bet2: Bet = {
      _id: "bet2",
      gameId: "game1",
      playerId: playerB,
      stat: statB,
      threshold: 8.5,
      overUnder: "under",
      betAmount: 100,
      multiplier: 3.0,
      potentialWinnings: 300,
      status: "pending",
      createdAt: new Date(),
      parlayId: "parlay1",
    };

    const bet3: Bet = {
      _id: "bet3",
      gameId: "game1",
      playerId: playerC,
      stat: statC,
      threshold: 6.5,
      overUnder: "over",
      betAmount: 100,
      multiplier: 3.0,
      potentialWinnings: 300,
      status: "pending",
      createdAt: new Date(),
      parlayId: "parlay1",
    };

    // Parlay database model requires exactly 3 betIds (tuple)
    const parlay: Parlay = {
      _id: "parlay1",
      gameId: "game1",
      betIds: [bet1._id, bet2._id, bet3._id],
      betType,
      totalBetAmount: 100,
      multiplier: 3.0,
      potentialWinnings: 300,
      status: "pending",
      createdAt: new Date(),
      contractId: "contract1",
    };

    // Contract model mirrors what we keep for a contract's lifecycle
    const contract: Contract = {
      _id: "contract1",
      contractLength: 3,
      parlayConfig: structuredParlay,
      totalWagered: 300,
      totalWinnings: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      winRate: 0,
      status: "active",
      createdAt: new Date(),
      parlayIds: [parlay._id],
      remainingGames: 3,
    };

    // Basic runtime sanity checks that also help ensure naming alignment
    expect(Array.isArray(structuredParlay.legs)).toBe(true);
    expect(structuredParlay.legs).toHaveLength(3);
    expect(parlay.betIds).toHaveLength(3);
    expect(contract.parlayIds.length).toBeGreaterThanOrEqual(1);
    expect(contract.parlayConfig.betType === "flex" || contract.parlayConfig.betType === "power").toBe(true);
  });
});


