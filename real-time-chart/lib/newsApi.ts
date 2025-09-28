const NEWS_API_BASE = 'http://localhost:5001';
const BACKEND_API_BASE = 'http://localhost:8000';

export interface NewsArticle {
  id?: string;
  title: string;
  url: string;
  published_at: string;
  byline?: string;
  summary?: string;
  image_url?: string;
  league?: string;
  teams: string[];
  players: string[];
  tags: string[];
  source: {
    id: string;
    name: string;
    type: string;
    homepage?: string;
  };
}

export interface PlayerSearchResponse {
  player: string;
  total_articles: number;
  search_date: string;
  date_range: {
    from: string | null;
    to: string | null;
  };
  articles: NewsArticle[];
}

export interface TimeState {
  currentTime: string;
  isSimulationMode: boolean;
}

export interface NewsSnippetData {
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  playerName?: string;
  url?: string;
}

export class NewsApiService {
  /**
   * Get current simulated system time
   */
  static async getCurrentTime(): Promise<Date> {
    try {
      const response = await fetch(`${BACKEND_API_BASE}/time`);
      const data: TimeState = await response.json();
      
      if (!response.ok) {
        throw new Error('Failed to get current time');
      }
      
      return new Date(data.currentTime);
    } catch (error) {
      console.error('Error fetching current time:', error);
      // Fallback to real time if API fails
      return new Date();
    }
  }

  /**
   * Search for news about a specific player within the past week
   */
  static async getPlayerNewsLastWeek(playerName: string, maxResults = 5): Promise<NewsArticle[]> {
    try {
      // Get current simulated time
      const currentTime = await this.getCurrentTime();
      
      // Calculate one week ago from current simulated time
      const oneWeekAgo = new Date(currentTime);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      // Format dates for API
      const fromDate = oneWeekAgo.toISOString().split('T')[0]; // YYYY-MM-DD format
      const toDate = currentTime.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      console.log(`Searching for news about ${playerName} from ${fromDate} to ${toDate}`);
      
      const params = new URLSearchParams({
        player: playerName,
        from_date: fromDate,
        to_date: toDate,
        max_results: maxResults.toString()
      });
      
      const response = await fetch(`${NEWS_API_BASE}/api/search/player?${params}`);
      const data: PlayerSearchResponse = await response.json();
      
      if (!response.ok) {
        throw new Error('Failed to fetch player news');
      }
      
      console.log(`Found ${data.total_articles} articles for ${playerName}`);
      return data.articles;
    } catch (error) {
      console.error('Error fetching player news:', error);
      return [];
    }
  }

  /**
   * Search for news about a specific player with custom date range
   */
  static async getPlayerNews(
    playerName: string, 
    fromDate?: Date, 
    toDate?: Date, 
    maxResults = 5
  ): Promise<NewsArticle[]> {
    try {
      const params = new URLSearchParams({
        player: playerName,
        max_results: maxResults.toString()
      });
      
      if (fromDate) {
        params.append('from_date', fromDate.toISOString().split('T')[0]);
      }
      if (toDate) {
        params.append('to_date', toDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`${NEWS_API_BASE}/api/search/player?${params}`);
      const data: PlayerSearchResponse = await response.json();
      
      if (!response.ok) {
        throw new Error('Failed to fetch player news');
      }
      
      return data.articles;
    } catch (error) {
      console.error('Error fetching player news:', error);
      return [];
    }
  }

  /**
   * Get headlines for all NBA athletes
   */
  static async getNBAAthletesHeadlines(maxResultsPerPlayer = 3): Promise<{title: string, url: string}[]> {
    try {
      const response = await fetch(`${NEWS_API_BASE}/api/headlines`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error('Failed to fetch headlines');
      }
      
      return data.top_headlines || [];
    } catch (error) {
      console.error('Error fetching headlines:', error);
      return [];
    }
  }

  /**
   * Transform article to news snippet data
   */
  static transformArticleToNewsSnippet(article: NewsArticle): NewsSnippetData {
    // Clean HTML tags from content
    const cleanContent = NewsApiService.stripHtmlTags(article.summary || article.title);
    
    return {
      title: NewsApiService.stripHtmlTags(article.title),
      content: cleanContent,
      source: article.source.name,
      publishedAt: article.published_at,
      sentiment: 'neutral', // Set all news to neutral sentiment
      playerName: article.players && article.players.length > 0 ? article.players[0] : undefined, // Use first player mentioned if available
      url: article.url // Include the article URL
    };
  }

  /**
   * Strip HTML tags from text content
   */
  static stripHtmlTags(html: string): string {
    if (!html) return '';
    
    // Remove HTML tags and decode HTML entities
    return html
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .trim();
  }
}
