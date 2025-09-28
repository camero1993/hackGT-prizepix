# Redis Schema Design for Betting System

## Overview
This document outlines the Redis schema design for a betting system with three main entities:
- **BET**: A unit of one prediction of a player's stats in a certain game (power/flex)
- **PARLAY**: A collection of exactly 3 bets (legs)
- **CONTRACT**: A series of parlays of the same risk-level with exit capability

## Redis Key Structure

### 1. BET Schema
```
bet:{betId} - Hash containing bet data
active_bets - Set of active bet IDs
bets_by_game:{gameId} - Set of bet IDs for a specific game
bets_by_player:{playerId} - Set of bet IDs for a specific player
bets_by_parlay:{parlayId} - Set of bet IDs for a specific parlay
bets_by_contract:{contractId} - Set of bet IDs for a specific contract
```

**Bet Hash Fields:**
- `betId`: string - Unique bet identifier
- `gameId`: string - Game this bet is for
- `playerId`: string - Player this bet is on
- `stat`: string - Stat being bet on (points, rebounds, assists)
- `threshold`: number - Expected value/line
- `overUnder`: string - "over" or "under"
- `betType`: string - "power" or "flex"
- `betAmount`: number - Amount wagered
- `multiplier`: number - Multiplier applied
- `potentialWinnings`: number - betAmount * multiplier
- `actual`: number - Actual performance (filled after game)
- `hit`: boolean - Whether bet won (filled after game)
- `actualWinnings`: number - Actual winnings (filled after game)
- `status`: string - "pending", "won", "lost"
- `createdAt`: string - ISO timestamp
- `resolvedAt`: string - ISO timestamp
- `parlayId`: string - Reference to parlay (if part of one)
- `contractId`: string - Reference to contract (if part of one)
- `legPosition`: number - Position in parlay (1, 2, or 3)

### 2. PARLAY Schema
```
parlay:{parlayId} - Hash containing parlay data
active_parlays - Set of active parlay IDs
parlays_by_game:{gameId} - Set of parlay IDs for a specific game
parlays_by_contract:{contractId} - Set of parlay IDs for a specific contract
parlay:{parlayId}:bets - Set of bet IDs in this parlay
```

**Parlay Hash Fields:**
- `parlayId`: string - Unique parlay identifier
- `gameId`: string - Game this parlay is for
- `betIds`: string - JSON array of exactly 3 bet IDs
- `betType`: string - "power" or "flex"
- `totalBetAmount`: number - Total amount wagered
- `multiplier`: number - Final multiplier
- `potentialWinnings`: number - Total potential winnings
- `actualWinnings`: number - Actual winnings (filled after resolution)
- `status`: string - "pending", "won", "lost"
- `createdAt`: string - ISO timestamp
- `resolvedAt`: string - ISO timestamp
- `contractId`: string - Reference to contract (if part of one)
- `riskLevel`: string - Risk level (low, medium, high)
- `legs`: string - JSON array of leg configurations

### 3. CONTRACT Schema
```
contract:{contractId} - Hash containing contract data
active_contracts - Set of active contract IDs
contracts_by_user:{userId} - Set of contract IDs for a specific user
contract:{contractId}:parlays - Set of parlay IDs in this contract
contract:{contractId}:bets - Set of bet IDs in this contract
```

**Contract Hash Fields:**
- `contractId`: string - Unique contract identifier
- `userId`: string - User who owns this contract
- `contractLength`: number - Number of games in contract (3 or 5)
- `riskLevel`: string - Risk level (low, medium, high)
- `parlayConfig`: string - JSON configuration for parlays
- `totalWagered`: number - Total amount wagered across all games
- `totalWinnings`: number - Total winnings across all games
- `gamesPlayed`: number - Games actually played
- `gamesWon`: number - Games won
- `winRate`: number - Win rate percentage
- `status`: string - "active", "completed", "cancelled", "exited"
- `createdAt`: string - ISO timestamp
- `completedAt`: string - ISO timestamp
- `exitedAt`: string - ISO timestamp
- `exitReason`: string - Reason for early exit
- `remainingGames`: number - Games remaining in contract
- `exitValue`: number - Value when exited (if applicable)
- `maxLoss`: number - Maximum loss threshold
- `profitTarget`: number - Profit target for exit

### 4. User State Schema
```
user:{userId}:state - Hash containing user state
user:{userId}:contracts - Set of contract IDs for user
user:{userId}:active_bets - Set of active bet IDs for user
user:{userId}:balance_history - Sorted set of balance history
user:{userId}:trade_logs - List of trade logs
```

**User State Hash Fields:**
- `userId`: string - Unique user identifier
- `balance`: number - Current balance
- `totalBetsPlaced`: number - Total bets placed
- `totalWinnings`: number - Total winnings
- `totalWagered`: number - Total amount wagered
- `activeContracts`: number - Number of active contracts
- `lastUpdated`: string - ISO timestamp

## Key Relationships

### Bet → Parlay
- Each bet belongs to at most one parlay
- Parlay contains exactly 3 bets
- Bet has `parlayId` and `legPosition` fields

### Parlay → Contract
- Each parlay belongs to at most one contract
- Contract contains multiple parlays (one per game)
- Parlay has `contractId` field

### Contract → User
- Each contract belongs to one user
- User can have multiple contracts
- Contract has `userId` field

## Indexing Strategy

### Primary Indexes
- `active_bets` - For quick access to all active bets
- `active_parlays` - For quick access to all active parlays
- `active_contracts` - For quick access to all active contracts

### Secondary Indexes
- `bets_by_game:{gameId}` - For game-specific queries
- `bets_by_player:{playerId}` - For player-specific queries
- `parlays_by_game:{gameId}` - For game-specific parlay queries
- `contracts_by_user:{userId}` - For user-specific contract queries

### Composite Indexes
- `bets_by_parlay:{parlayId}` - For parlay bet queries
- `bets_by_contract:{contractId}` - For contract bet queries
- `parlays_by_contract:{contractId}` - For contract parlay queries

## Data Consistency

### Atomic Operations
- When creating a parlay, all 3 bets must be created atomically
- When resolving a parlay, all 3 bets must be resolved atomically
- When exiting a contract, all remaining parlays must be cancelled atomically

### Transaction Support
- Use Redis transactions (MULTI/EXEC) for complex operations
- Use Redis Lua scripts for complex atomic operations

## Performance Considerations

### Memory Usage
- Use appropriate data types (Hash for structured data, Set for relationships)
- Implement TTL for completed/resolved entities
- Use compression for large JSON fields

### Query Optimization
- Pre-compute frequently accessed aggregations
- Use sorted sets for time-based queries
- Implement pagination for large result sets

## Migration Strategy

### Phase 1: Schema Update
1. Add new fields to existing hashes
2. Create new index structures
3. Update application code to use new schema

### Phase 2: Data Migration
1. Migrate existing data to new structure
2. Verify data integrity
3. Update indexes

### Phase 3: Cleanup
1. Remove old fields
2. Optimize performance
3. Add monitoring

## Example Usage

### Creating a Contract
```
1. Create contract hash: contract:{contractId}
2. Add to active_contracts set
3. Add to user's contracts set
4. Update user state
```

### Creating a Parlay
```
1. Create 3 bet hashes: bet:{betId1}, bet:{betId2}, bet:{betId3}
2. Create parlay hash: parlay:{parlayId}
3. Add bets to parlay's bet set
4. Add parlay to contract's parlay set
5. Update all indexes
```

### Exiting a Contract
```
1. Mark contract as exited
2. Cancel all remaining parlays
3. Cancel all remaining bets
4. Calculate exit value
5. Update user balance
6. Log transaction
```
