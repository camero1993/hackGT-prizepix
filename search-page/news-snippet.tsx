import React from 'react';

interface NewsSnippetProps {
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  playerName?: string;
  className?: string;
}

export function NewsSnippet({
  title,
  content,
  source,
  publishedAt,
  sentiment = 'neutral',
  playerName,
  className = ''
}: NewsSnippetProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'border-l-green-500 bg-green-500/5';
      case 'negative':
        return 'border-l-red-500 bg-red-500/5';
      case 'neutral':
      default:
        return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div className={`rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md ${getSentimentColor(sentiment)} ${className}`}>
      {/* Header with source and timestamp */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {source}
          </span>
          {playerName && (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {playerName}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDate(publishedAt)}
        </span>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-sm font-semibold text-card-foreground line-clamp-2">
        {title}
      </h3>

      {/* Content */}
      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
        {content}
      </p>

      {/* Sentiment indicator */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className={`h-2 w-2 rounded-full ${
            sentiment === 'positive' ? 'bg-green-500' : 
            sentiment === 'negative' ? 'bg-red-500' : 
            'bg-blue-500'
          }`} />
          <span className="text-xs text-muted-foreground capitalize">
            {sentiment}
          </span>
        </div>
        
        {/* Read more indicator */}
        <button className="text-xs text-primary hover:text-primary/80 transition-colors">
          Read more →
        </button>
      </div>
    </div>
  );
}

// Container component for multiple news snippets
interface NewsSnippetsContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function NewsSnippetsContainer({ children, className = '' }: NewsSnippetsContainerProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {children}
    </div>
  );
}

// Example usage component with hardcoded data
export function ExampleNewsSnippets() {
  const exampleNews = [
    {
      title: "LeBron James Records Triple-Double in Lakers Victory",
      content: "LeBron James delivered a masterful performance with 28 points, 12 rebounds, and 10 assists as the Los Angeles Lakers defeated the Phoenix Suns 115-108. The 38-year-old forward continues to defy age with his consistent all-around play.",
      source: "ESPN",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      sentiment: "positive" as const,
      playerName: "LeBron James"
    },
    {
      title: "Stephen Curry Struggles with Shooting in Warriors Loss",
      content: "The Golden State Warriors fell to the Denver Nuggets 98-112 as Stephen Curry had an off night, shooting just 6-18 from the field and 2-10 from three-point range. The two-time MVP finished with 18 points.",
      source: "NBA.com",
      publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      sentiment: "negative" as const,
      playerName: "Stephen Curry"
    },
    {
      title: "Giannis Antetokounmpo Named Eastern Conference Player of the Week",
      content: "The Milwaukee Bucks forward averaged 32.4 points, 12.8 rebounds, and 6.2 assists over the past week, leading his team to a 3-1 record. This marks his third Player of the Week honor this season.",
      source: "Bleacher Report",
      publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
      sentiment: "positive" as const,
      playerName: "Giannis Antetokounmpo"
    },
    {
      title: "Luka Dončić Injury Update: MRI Shows No Structural Damage",
      content: "The Dallas Mavericks star underwent an MRI on his right ankle after leaving yesterday's game. Results show no structural damage, and he's listed as day-to-day. The team expects him to return within the next few games.",
      source: "The Athletic",
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
      sentiment: "neutral" as const,
      playerName: "Luka Dončić"
    },
    {
      title: "Kevin Durant Trade Rumors Heat Up as Trade Deadline Approaches",
      content: "Multiple teams have reportedly expressed interest in acquiring the Phoenix Suns forward, with the Miami Heat and Boston Celtics emerging as potential suitors. The Suns are reportedly open to listening to offers.",
      source: "Shams Charania",
      publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
      sentiment: "neutral" as const,
      playerName: "Kevin Durant"
    }
  ];

  return (
    <div className="w-full">
      <h2 className="mb-6 text-2xl font-bold text-foreground">Latest NBA News</h2>
      <NewsSnippetsContainer>
        {exampleNews.map((news, index) => (
          <NewsSnippet
            key={index}
            title={news.title}
            content={news.content}
            source={news.source}
            publishedAt={news.publishedAt}
            sentiment={news.sentiment}
            playerName={news.playerName}
          />
        ))}
      </NewsSnippetsContainer>
    </div>
  );
}
