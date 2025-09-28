const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export interface Player {
  id: string;
  fullName: string;
  headshotUrl?: string;
  position?: string;
  teamId?: string;
  active?: boolean;
}

export interface Team {
  id: string;
  name: string;
  tricode: string;
  city: string;
  logoUrl: string;
}

export interface ApiError {
  error: string;
  details?: any;
}

// Generic API call function
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// Search players
export async function searchPlayers(query: string, limit: number = 20): Promise<Player[]> {
  const searchParams = new URLSearchParams();
  if (query) searchParams.append('search', query);
  searchParams.append('active_only', 'true');
  searchParams.append('limit', limit.toString());
  
  return apiCall<Player[]>(`/players?${searchParams.toString()}`);
}

// Search star players (only the 10 tracked players with stats loaded)
export async function searchStarPlayers(query: string): Promise<Player[]> {
  const searchParams = new URLSearchParams();
  if (query) searchParams.append('search', query);
  
  return apiCall<Player[]>(`/players/star?${searchParams.toString()}`);
}

// Get all players
export async function getPlayers(limit: number = 600): Promise<Player[]> {
  return apiCall<Player[]>(`/players?active_only=true&limit=${limit}`);
}

// Get all star players
export async function getStarPlayers(): Promise<Player[]> {
  return apiCall<Player[]>(`/players/star`);
}

// Get player by ID (we'll need to add this endpoint or use search)
export async function getPlayerById(playerId: string): Promise<Player | null> {
  try {
    const players = await searchPlayers(playerId, 1);
    return players.find(p => p.id === playerId) || null;
  } catch (error) {
    console.error('Error fetching player by ID:', error);
    return null;
  }
}

// Get teams
export async function getTeams(): Promise<Team[]> {
  return apiCall<Team[]>('/teams');
}

// Get team by ID
export async function getTeamById(teamId: string): Promise<Team | null> {
  try {
    return await apiCall<Team>(`/teams/${teamId}`);
  } catch (error) {
    console.error('Error fetching team by ID:', error);
    return null;
  }
}

// Check API health
export async function checkHealth(): Promise<{ status: string; database: string }> {
  return apiCall<{ status: string; database: string }>('/health');
}
