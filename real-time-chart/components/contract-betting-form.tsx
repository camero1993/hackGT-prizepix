"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X, TrendingUp, TrendingDown } from "lucide-react";
import { searchStarPlayers, Player } from "@/lib/api";
import { calculateFiveGameAverage } from "@/lib/parlayUtils";

interface BetConfiguration {
  playerId: string;
  playerName: string;
  stat: 'points' | 'rebounds' | 'assists';
  overUnder: 'over' | 'under';
  threshold: number; // This would come from the backend based on expected values
}

interface ContractBettingFormProps {
  onPlaceContract: (contractData: {
    contractLength: 3 | 5;
    parlayConfig: {
      legs: [BetConfiguration, BetConfiguration, BetConfiguration];
      betType: 'flex' | 'power';
      betAmount: number;
    };
  }) => void;
  isLoading?: boolean;
}

export function ContractBettingForm({ onPlaceContract, isLoading = false }: ContractBettingFormProps) {
  // Contract configuration
  const [contractLength, setContractLength] = useState<3 | 5>(5);
  const [parlayType, setParlayType] = useState<'flex' | 'power'>('flex');
  const [betAmount, setBetAmount] = useState<string>('');

  // Individual bet configurations
  const [bets, setBets] = useState<BetConfiguration[]>([
    { playerId: '', playerName: '', stat: 'points', overUnder: 'over', threshold: 0 },
    { playerId: '', playerName: '', stat: 'points', overUnder: 'over', threshold: 0 },
    { playerId: '', playerName: '', stat: 'points', overUnder: 'over', threshold: 0 },
  ]);

  // Search states for each bet
  const [searchQueries, setSearchQueries] = useState<string[]>(['', '', '']);
  const [searchResults, setSearchResults] = useState<Player[][]>([[], [], []]);
  const [showSearchResults, setShowSearchResults] = useState<boolean[]>([false, false, false]);
  const [isSearching, setIsSearching] = useState<boolean[]>([false, false, false]);
  const [isThresholdLoading, setIsThresholdLoading] = useState<boolean[]>([false, false, false]);

  // Handle player search for a specific bet index
  const handlePlayerSearch = async (betIndex: number, query: string) => {
    const newQueries = [...searchQueries];
    newQueries[betIndex] = query;
    setSearchQueries(newQueries);

    if (query.length > 1) {
      const newSearching = [...isSearching];
      newSearching[betIndex] = true;
      setIsSearching(newSearching);

      try {
        const results = await searchStarPlayers(query);
        const newSearchResults = [...searchResults];
        newSearchResults[betIndex] = results;
        setSearchResults(newSearchResults);

        const newShowResults = [...showSearchResults];
        newShowResults[betIndex] = true;
        setShowSearchResults(newShowResults);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        const newSearching = [...isSearching];
        newSearching[betIndex] = false;
        setIsSearching(newSearching);
      }
    } else {
      const newSearchResults = [...searchResults];
      newSearchResults[betIndex] = [];
      setSearchResults(newSearchResults);

      const newShowResults = [...showSearchResults];
      newShowResults[betIndex] = false;
      setShowSearchResults(newShowResults);
    }
  };

  // Handle player selection
  const handlePlayerSelect = (betIndex: number, player: Player) => {
    const newBets = [...bets];
    newBets[betIndex] = {
      ...newBets[betIndex],
      playerId: player.id,
      playerName: player.fullName,
    };
    setBets(newBets);

    // Load threshold based on 5-game average for current stat
    void loadThresholdForBet(betIndex, player.id, newBets[betIndex].stat);

    // Clear search
    const newQueries = [...searchQueries];
    newQueries[betIndex] = '';
    setSearchQueries(newQueries);

    const newShowResults = [...showSearchResults];
    newShowResults[betIndex] = false;
    setShowSearchResults(newShowResults);
  };

  // Handle bet configuration changes
  const updateBet = (betIndex: number, field: keyof BetConfiguration, value: any) => {
    const newBets = [...bets];
    newBets[betIndex] = { ...newBets[betIndex], [field]: value };
    setBets(newBets);

    // If stat changed and player selected, refresh threshold
    if (field === 'stat' && newBets[betIndex].playerId) {
      void loadThresholdForBet(betIndex, newBets[betIndex].playerId, value);
    }
  };

  // Load and set threshold using existing 5-game average helper
  const loadThresholdForBet = async (
    betIndex: number,
    playerId: string,
    stat: 'points' | 'rebounds' | 'assists'
  ) => {
    const loading = [...isThresholdLoading];
    loading[betIndex] = true;
    setIsThresholdLoading(loading);

    try {
      const avg = await calculateFiveGameAverage(playerId, stat);
      const newBets = [...bets];
      newBets[betIndex] = { ...newBets[betIndex], threshold: Number(avg.toFixed(1)) };
      setBets(newBets);
    } catch (e) {
      console.error('Failed to load 5-game average:', e);
    } finally {
      const loadingDone = [...isThresholdLoading];
      loadingDone[betIndex] = false;
      setIsThresholdLoading(loadingDone);
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      betAmount &&
      Number(betAmount) > 0 &&
      bets.every(bet => bet.playerId && bet.playerName) &&
      bets.every(bet => bet.stat) &&
      bets.every(bet => bet.overUnder)
    );
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!isFormValid()) return;

    const contractData = {
      contractLength,
      parlayConfig: {
        legs: bets as [BetConfiguration, BetConfiguration, BetConfiguration],
        betType: parlayType,
        betAmount: Number(betAmount),
      },
    };

    onPlaceContract(contractData);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-primary">Place Contract Bet</CardTitle>
        <CardDescription className="text-muted-foreground">
          Create a contract with 3 player bets for {contractLength} games
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contract Length */}
        <div>
          <Label className="text-sm font-medium mb-2 block text-foreground">
            Contract Length
          </Label>
          <div className="flex gap-2">
            <Button
              variant={contractLength === 3 ? "default" : "outline"}
              className={contractLength === 3 ? "bg-primary text-white" : ""}
              onClick={() => setContractLength(3)}
            >
              3 Games
            </Button>
            <Button
              variant={contractLength === 5 ? "default" : "outline"}
              className={contractLength === 5 ? "bg-primary text-white" : ""}
              onClick={() => setContractLength(5)}
            >
              5 Games
            </Button>
          </div>
        </div>

        {/* Individual Bet Configurations */}
        <div>
          <Label className="text-sm font-medium mb-4 block text-foreground">
            Configure 3 Bets
          </Label>
          <div className="space-y-4">
            {bets.map((bet, betIndex) => (
              <Card key={betIndex} className="bg-muted/50 border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-foreground">Bet {betIndex + 1}</h4>
                    {bet.playerName && (
                      <Badge variant="secondary" className="text-xs">
                        {bet.playerName}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Player Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Player
                      </Label>
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input
                            placeholder="Search player..."
                            value={searchQueries[betIndex]}
                            onChange={(e) => handlePlayerSearch(betIndex, e.target.value)}
                            className="pl-10"
                          />
                          {bet.playerName && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                              onClick={() => {
                                const newBets = [...bets];
                                newBets[betIndex] = {
                                  ...newBets[betIndex],
                                  playerId: '',
                                  playerName: '',
                                };
                                setBets(newBets);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        {/* Search Results */}
                        {showSearchResults[betIndex] && searchResults[betIndex].length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {searchResults[betIndex].map((player) => (
                              <div
                                key={player.id}
                                className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                                onClick={() => handlePlayerSelect(betIndex, player)}
                              >
                                {player.fullName}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stat Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Stat Type
                      </Label>
                      <Select
                        value={bet.stat}
                        onValueChange={(value) => updateBet(betIndex, 'stat', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="points">Points</SelectItem>
                          <SelectItem value="rebounds">Rebounds</SelectItem>
                          <SelectItem value="assists">Assists</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Over/Under Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Over/Under
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant={bet.overUnder === 'over' ? 'default' : 'outline'}
                          size="sm"
                          className={bet.overUnder === 'over' ? 'bg-green-600 hover:bg-green-700' : ''}
                          onClick={() => updateBet(betIndex, 'overUnder', 'over')}
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Over
                        </Button>
                        <Button
                          variant={bet.overUnder === 'under' ? 'default' : 'outline'}
                          size="sm"
                          className={bet.overUnder === 'under' ? 'bg-red-600 hover:bg-red-700' : ''}
                          onClick={() => updateBet(betIndex, 'overUnder', 'under')}
                        >
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Under
                        </Button>
                      </div>
                    </div>

                    {/* Threshold Display */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Threshold
                      </Label>
                      <div className="px-3 py-2 bg-muted rounded-md text-sm">
                        {isThresholdLoading[betIndex]
                          ? 'Loading...'
                          : bet.threshold > 0
                            ? `${bet.threshold} ${bet.stat}`
                            : '—'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Parlay Type Selection */}
        <div>
          <Label className="text-sm font-medium mb-2 block text-foreground">
            Parlay Type
          </Label>
          <div className="flex gap-2">
            <Button
              variant={parlayType === 'flex' ? "default" : "outline"}
              className={parlayType === 'flex' ? "bg-primary text-white" : ""}
              onClick={() => setParlayType('flex')}
            >
              Flex (Partial Payouts)
            </Button>
            <Button
              variant={parlayType === 'power' ? "default" : "outline"}
              className={parlayType === 'power' ? "bg-primary text-white" : ""}
              onClick={() => setParlayType('power')}
            >
              Power (All-or-Nothing)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {parlayType === 'flex' 
              ? '2/3 = 1.5x, 3/3 = 3x' 
              : 'Exponential payouts: 2^legs (2/3 = 4x, 3/3 = 8x)'
            }
          </p>
        </div>

        {/* Bet Amount */}
        <div>
          <Label className="text-sm font-medium mb-2 block text-foreground">
            Bet Amount ($)
          </Label>
          <Input
            type="number"
            placeholder="Enter amount"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            min="1"
            step="0.01"
          />
        </div>

        {/* Submit Button */}
        <Button
          className="w-full text-white"
          size="lg"
          disabled={!isFormValid() || isLoading}
          onClick={handleSubmit}
        >
          {isLoading ? 'Creating Contract...' : `Place Contract - $${betAmount || '0'}`}
        </Button>

        {/* Form Validation Summary */}
        {!isFormValid() && (
          <div className="text-xs text-muted-foreground">
            {!betAmount && '• Enter bet amount'}
            {bets.some(bet => !bet.playerId) && '• Select all 3 players'}
            {bets.some(bet => !bet.stat) && '• Select stat type for all bets'}
            {bets.some(bet => !bet.overUnder) && '• Select over/under for all bets'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
