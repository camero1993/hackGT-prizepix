"""
HTTP client with retries, rate limiting, and caching for news sources.
"""

import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import httpx
from urllib.parse import urlparse

from app.config import get_settings

logger = logging.getLogger(__name__)


class HTTPFetcher:
    """HTTP client with retries, rate limiting, and caching."""
    
    def __init__(self, timeout: int = None, max_retries: int = None):
        """Initialize the HTTP fetcher.
        
        Args:
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries
        """
        self.settings = get_settings()
        self.timeout = timeout or self.settings.http_timeout_seconds
        self.max_retries = max_retries or self.settings.http_max_retries
        self.backoff_base = self.settings.http_backoff_base
        
        # Rate limiting per domain
        self._rate_limits: Dict[str, float] = {}
        self._last_request: Dict[str, datetime] = {}
        
        # Simple in-memory cache
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = timedelta(hours=1)
    
    async def __aenter__(self):
        """Async context manager entry."""
        self.client = httpx.AsyncClient(
            timeout=self.timeout,
            headers={
                'User-Agent': self.settings.user_agent,
                'Accept': 'text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml,*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if hasattr(self, 'client'):
            await self.client.aclose()
    
    async def get(
        self, 
        url: str, 
        use_cache: bool = True,
        rate_limit: Optional[float] = None
    ) -> Optional[httpx.Response]:
        """Fetch a URL with retries and rate limiting.
        
        Args:
            url: URL to fetch
            use_cache: Whether to use cached response
            rate_limit: Custom rate limit for this request (requests per second)
            
        Returns:
            HTTP response or None if failed
        """
        try:
            # Check cache first
            if use_cache and url in self._cache:
                cached_data = self._cache[url]
                if datetime.now() - cached_data['timestamp'] < self._cache_ttl:
                    logger.debug(f"Using cached response for {url}")
                    return cached_data['response']
                else:
                    # Remove expired cache entry
                    del self._cache[url]
            
            # Apply rate limiting
            await self._apply_rate_limit(url, rate_limit)
            
            # Make request with retries
            response = await self._make_request_with_retries(url)
            
            if response and use_cache:
                # Cache successful response
                self._cache[url] = {
                    'response': response,
                    'timestamp': datetime.now()
                }
            
            return response
            
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return None
    
    async def _make_request_with_retries(self, url: str) -> Optional[httpx.Response]:
        """Make HTTP request with exponential backoff retries.
        
        Args:
            url: URL to fetch
            
        Returns:
            HTTP response or None if all retries failed
        """
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                logger.debug(f"Fetching {url} (attempt {attempt + 1}/{self.max_retries + 1})")
                
                response = await self.client.get(url)
                response.raise_for_status()
                
                logger.debug(f"Successfully fetched {url} (status: {response.status_code})")
                return response
                
            except httpx.HTTPStatusError as e:
                if e.response.status_code in [404, 403, 429]:
                    # Don't retry on these status codes
                    logger.warning(f"HTTP error {e.response.status_code} for {url}: {e}")
                    return None
                last_exception = e
                
            except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError) as e:
                last_exception = e
                logger.warning(f"Request error for {url} (attempt {attempt + 1}): {e}")
            
            # Wait before retry (exponential backoff with jitter)
            if attempt < self.max_retries:
                wait_time = self.backoff_base * (2 ** attempt)
                # Add jitter to prevent thundering herd
                import random
                jitter = random.uniform(0.1, 0.5)
                wait_time += jitter
                
                logger.debug(f"Waiting {wait_time:.2f}s before retry")
                await asyncio.sleep(wait_time)
        
        logger.error(f"All retries failed for {url}: {last_exception}")
        return None
    
    async def _apply_rate_limit(self, url: str, custom_rate_limit: Optional[float] = None):
        """Apply rate limiting based on domain.
        
        Args:
            url: URL being requested
            custom_rate_limit: Custom rate limit for this request
        """
        try:
            domain = urlparse(url).netloc
            if not domain:
                return
            
            # Get rate limit for this domain
            rate_limit = custom_rate_limit or self.settings.default_rate_limit_per_second
            min_interval = 1.0 / rate_limit
            
            # Check if we need to wait
            now = datetime.now()
            if domain in self._last_request:
                time_since_last = (now - self._last_request[domain]).total_seconds()
                if time_since_last < min_interval:
                    wait_time = min_interval - time_since_last
                    logger.debug(f"Rate limiting: waiting {wait_time:.2f}s for {domain}")
                    await asyncio.sleep(wait_time)
            
            # Update last request time
            self._last_request[domain] = datetime.now()
            
        except Exception as e:
            logger.debug(f"Error applying rate limit: {e}")
    
    def clear_cache(self):
        """Clear the response cache."""
        self._cache.clear()
        logger.debug("Cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        now = datetime.now()
        total_entries = len(self._cache)
        expired_entries = sum(
            1 for data in self._cache.values()
            if now - data['timestamp'] > self._cache_ttl
        )
        
        return {
            'total_entries': total_entries,
            'expired_entries': expired_entries,
            'active_entries': total_entries - expired_entries,
            'cache_ttl_hours': self._cache_ttl.total_seconds() / 3600
        }

