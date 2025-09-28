import { useState } from 'react';
import { Contract, StructuredParlayRequest, BetConfiguration } from '@/lib/api';

interface ContractCreationData {
  contractLength: 3 | 5;
  parlayConfig: {
    legs: [BetConfiguration, BetConfiguration, BetConfiguration];
    betType: 'flex' | 'power';
    betAmount: number;
  };
}

interface UseContractCreationReturn {
  isLoading: boolean;
  error: string | null;
  createContract: (data: ContractCreationData) => Promise<Contract | null>;
}

export function useContractCreation(): UseContractCreationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createContract = async (data: ContractCreationData): Promise<Contract | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Convert BetConfiguration to ParlayRequest format
      const parlayRequests = data.parlayConfig.legs.map(leg => ({
        playerId: leg.playerId,
        stat: leg.stat,
        overUnder: leg.overUnder,
      }));

      // Create the structured parlay request
      const structuredParlayRequest: StructuredParlayRequest = {
        legs: parlayRequests as [any, any, any], // Type assertion for the tuple
        betType: data.parlayConfig.betType,
        betAmount: data.parlayConfig.betAmount,
      };

      // Create the contract request
      const contractRequest = {
        contract_length: data.contractLength,
        parlays: [structuredParlayRequest], // The API expects an array, but we're creating one contract
      };

      // Call the backend API to create the contract
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create contract');
      }

      const result = await response.json();
      
      // The API returns a simulation result, but we need to create a contract
      // For now, we'll create a mock contract structure
      // In a real implementation, you'd have a separate contract creation endpoint
      const contract: Contract = {
        _id: `contract_${Date.now()}`,
        contractLength: data.contractLength,
        parlayConfig: structuredParlayRequest,
        totalWagered: data.parlayConfig.betAmount * data.contractLength,
        totalWinnings: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        status: 'active',
        createdAt: new Date(),
        parlayIds: [],
        remainingGames: data.contractLength,
      };

      return contract;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Contract creation failed:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createContract,
  };
}
