/*=============================================
  XBZ Prime TV - Breaking News API Module
  Fetch Breaking News from GitHub Raw JSON
  =============================================*/

'use strict';

var BreakingNewsAPI = {
    /**
     * Fetch breaking news from GitHub raw URL
     */
    fetchBreakingNews: async function(force) {
        if (force === undefined) force = false;

        if (!force) {
            var cached = Utils.getFromStorage(
                CONFIG.STORAGE_KEYS.BREAKING_NEWS,
                CONFIG.CACHE_BREAKING_NEWS
            );
            if (cached && cached.length > 0) {
                console.log('[BREAKING] Using cached breaking news');
                return cached;
            }
        }

        StateManager.set('breakingNews.isLoading', true);
        StateManager.set('breakingNews.error', null);

        try {
            console.log('[BREAKING] Fetching breaking news...');

            var controller = new AbortController();
            STATE.abortControllers.breakingNewsFetch = controller;

            var response;
            
            try {
                response = await fetch(CONFIG.GITHUB_BREAKING_NEWS_URL, {
                    signal: controller.signal,
                    cache: 'no-cache',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json, text/plain, */*'
                    }
                });
                console.log('[BREAKING] Direct fetch successful');
            } catch (directError) {
                console.log('[BREAKING] Direct fetch failed, error:', directError.message);
                
                if (CONFIG.CORS_PROXY) {
                    console.log('[BREAKING] Trying CORS proxy...');
                    var proxyUrl = CONFIG.CORS_PROXY + encodeURIComponent(CONFIG.GITHUB_BREAKING_NEWS_URL);
                    response = await fetch(proxyUrl, {
                        signal: controller.signal,
                        cache: 'no-cache',
                        headers: {
                            'Accept': 'application/json, text/plain, */*'
                        }
                    });
                    console.log('[BREAKING] Proxy fetch successful');
                } else {
                    throw directError;
                }
            }

            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }

            var text = await response.text();
            var data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error('Invalid JSON response from breaking news');
            }

            var newsItems = this.processNewsData(data);
            console.log('[BREAKING] Fetched ' + newsItems.length + ' news items');

            Utils.setToStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS, newsItems);
            Utils.setToStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS_TIMESTAMP, Date.now());

            StateManager.set('breakingNews.items', newsItems);
            StateManager.set('breakingNews.isLoaded', true);
            StateManager.set('breakingNews.lastUpdated', new Date().toISOString());
            StateManager.set('breakingNews.isLoading', false);

            Utils.triggerEvent(document.body, 'breakingnews:loaded', {
                count: newsItems.length
            });

            return newsItems;

        } catch (error) {
            console.error('[BREAKING] Error fetching breaking news:', error);

            StateManager.set('breakingNews.error', error.message);
            StateManager.set('breakingNews.isLoading', false);

            var cached = Utils.getFromStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS);
            if (cached && cached.length > 0) {
                console.log('[BREAKING] Using cached breaking news as fallback');
                StateManager.set('breakingNews.items', cached);
                StateManager.set('breakingNews.isLoaded', true);
                return cached;
            }

            var fallback = this.generateFallbackNews();
            StateManager.set('breakingNews.items', fallback);
            StateManager.set('breakingNews.isLoaded', true);
            console.log('[BREAKING] Using fallback news data');
            return fallback;
        }
    },

    /**
     * Process raw news data into normalized format
     */
    processNewsData: function(data) {
        try {
            var items = [];

            if (Array.isArray(data)) {
                items = data;
            } else if (typeof data === 'object' && data !== null) {
                items = data.breaking || data.news || data.items || data.data || [];
                if (!Array.isArray(items)) {
                    items = [data];
                }
            }

            var self = this;
            return items
                .map(function(item, index) {
                    return self.normalizeNewsItem(item, index);
                })
                .filter(function(item) {
                    return item !== null && item.title && item.title.trim();
                });

        } catch (error) {
            console.error('[BREAKING] Error processing news data:', error);
            return [];
        }
    },

    /**
     * Normalize a single news item
     */
    normalizeNewsItem: function(item, index) {
        try {
            if (!item) return null;

            if (typeof item === 'string') {
                return {
                    id: Utils.generateId('news'),
                    title: item.trim(),
                    content: item.trim(),
                    url: null,
                    category: 'General',
                    timestamp: new Date().toISOString(),
                    priority: 'normal',
                    isLive: false,
                    source: null
                };
            }

            if (typeof item === 'object') {
                return {
                    id: item.id || Utils.generateId('news'),
                    title: (item.title || item.headline || item.text || '').trim(),
                    content: (item.content || item.description || item.body || item.title || '').trim(),
                    url: item.url || item.link || item.href || null,
                    category: (item.category || item.type || item.tag || 'General').trim(),
                    timestamp: item.timestamp || item.date || item.time || item.publishedAt || new Date().toISOString(),
                    priority: (item.priority || item.level || 'normal').toLowerCase(),
                    isLive: item.isLive || item.live || item.breaking || false,
                    source: item.source || item.author || null,
                    image: item.image || item.thumbnail || null
                };
            }

            return null;

        } catch (error) {
            console.error('[BREAKING] Error normalizing news item:', error);
            return null;
        }
    },

    /**
     * Get breaking/live news only
     */
    getBreakingItems: function() {
        return STATE.breakingNews.items.filter(function(item) {
            return item.isLive || item.priority === 'high' || item.priority === 'breaking';
        });
    },

    /**
     * Get news by category
     */
    getNewsByCategory: function(category) {
        return STATE.breakingNews.items.filter(function(item) {
            return item.category.toLowerCase() === category.toLowerCase();
        });
    },

    /**
     * Get recent news
     */
    getRecentNews: function(count) {
        if (count === undefined) count = 10;
        
        return STATE.breakingNews.items.slice().sort(function(a, b) {
            return new Date(b.timestamp) - new Date(a.timestamp);
        }).slice(0, count);
    },

    /**
     * Format news for marquee ticker display
     */
    getTickerItems: function() {
        var items = STATE.breakingNews.items;

        if (items.length === 0) {
            return [{
                id: 'default',
                text: 'Welcome to XBZ Prime TV - Premium Sports Live Streaming',
                isLive: false,
                priority: 'normal',
                category: 'General'
            }];
        }

        return items.map(function(item) {
            return {
                id: item.id,
                text: item.title,
                url: item.url,
                isLive: item.isLive,
                priority: item.priority,
                category: item.category
            };
        });
    },

    /**
     * Generate HTML for ticker content
     */
    generateTickerHTML: function() {
        var items = this.getTickerItems();

        if (items.length === 0) {
            return '<span class="ticker-item">No breaking news available</span>';
        }

        var duplicatedItems = [];
        for (var i = 0; i < CONFIG.UI.MARQUEE_DUPLICATE_COUNT; i++) {
            duplicatedItems = duplicatedItems.concat(items);
        }

        var html = '';
        duplicatedItems.forEach(function(item, index) {
            var separator = index > 0 ? '<span class="ticker-separator">|</span>' : '';
            var liveBadge = item.isLive ? '<span class="live-dot"></span> ' : '';
            
            var content;
            if (item.url) {
                content = '<a href="' + Utils.escapeHTML(item.url) + '" target="_blank" rel="noopener noreferrer">' + Utils.escapeHTML(item.text) + '</a>';
            } else {
                content = Utils.escapeHTML(item.text);
            }

            html += separator + '<span class="ticker-item">' + liveBadge + content + '</span>';
        });

        return html;
    },

    /**
     * Start auto-refresh for breaking news
     */
    startAutoRefresh: function() {
        this.stopAutoRefresh();

        console.log('[BREAKING] Starting auto-refresh every ' + (CONFIG.REFRESH_BREAKING_NEWS / 1000) + 's');

        var self = this;
        STATE.timers.breakingNewsRefresh = setInterval(async function() {
            try {
                console.log('[BREAKING] Auto-refreshing breaking news...');
                await self.fetchBreakingNews(true);
                self.updateTickerDOM();
                console.log('[BREAKING] Auto-refresh complete');
            } catch (error) {
                console.error('[BREAKING] Auto-refresh failed:', error);
            }
        }, CONFIG.REFRESH_BREAKING_NEWS);
    },

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh: function() {
        if (STATE.timers.breakingNewsRefresh) {
            clearInterval(STATE.timers.breakingNewsRefresh);
            STATE.timers.breakingNewsRefresh = null;
            console.log('[BREAKING] Auto-refresh stopped');
        }
    },

    /**
     * Update ticker DOM element with latest news
     */
    updateTickerDOM: function() {
        try {
            var tickerContent = Utils.$('#ticker-content');
            if (tickerContent) {
                tickerContent.innerHTML = this.generateTickerHTML();
            }
        } catch (error) {
            console.error('[BREAKING] Error updating ticker DOM:', error);
        }
    },

    /**
     * Generate fallback news for offline/error states
     */
    generateFallbackNews: function() {
        console.log('[BREAKING] Generating fallback news data');

        return [
            {
                id: 'fallback-1',
                title: 'Welcome to XBZ Prime TV - Your Premium Sports Streaming Platform',
                content: 'Watch live sports from around the world on XBZ Prime TV.',
                url: null,
                category: 'Sports',
                timestamp: new Date().toISOString(),
                priority: 'high',
                isLive: true,
                source: 'XBZ Prime TV'
            },
            {
                id: 'fallback-2',
                title: 'Multiple Sports Channels Available - Football, Cricket & More',
                content: 'Access hundreds of live sports channels in HD quality.',
                url: null,
                category: 'Sports',
                timestamp: new Date().toISOString(),
                priority: 'normal',
                isLive: false,
                source: 'XBZ Prime TV'
            },
            {
                id: 'fallback-3',
                title: 'Live Scores Updated Automatically - Stay Connected',
                content: 'Real-time football scores and match updates available.',
                url: null,
                category: 'Football',
                timestamp: new Date().toISOString(),
                priority: 'normal',
                isLive: true,
                source: 'XBZ Prime TV'
            },
            {
                id: 'fallback-4',
                title: 'Install XBZ Prime TV as PWA for the Best Experience',
                content: 'Add to home screen for quick access to live sports.',
                url: null,
                category: 'App',
                timestamp: new Date().toISOString(),
                priority: 'normal',
                isLive: false,
                source: 'XBZ Prime TV'
            },
            {
                id: 'fallback-5',
                title: 'Stream from Multiple Sources - Auto Failover Support',
                content: 'If one stream fails, automatically try the next available source.',
                url: null,
                category: 'Tech',
                timestamp: new Date().toISOString(),
                priority: 'normal',
                isLive: false,
                source: 'XBZ Prime TV'
            }
        ];
    },

    /**
     * Search news items
     */
    searchNews: function(query) {
        if (!query || query.trim() === '') {
            return STATE.breakingNews.items;
        }

        var searchTerms = query.toLowerCase().trim().split(/\s+/);

        return STATE.breakingNews.items.filter(function(item) {
            var searchText = [
                item.title,
                item.content,
                item.category,
                item.source
            ].join(' ').toLowerCase();

            return searchTerms.every(function(term) {
                return searchText.indexOf(term) !== -1;
            });
        });
    },

    /**
     * Get breaking news statistics
     */
    getStats: function() {
        var items = STATE.breakingNews.items;

        var categories = [];
        items.forEach(function(item) {
            if (categories.indexOf(item.category) === -1) {
                categories.push(item.category);
            }
        });

        var hasLiveNews = items.some(function(item) {
            return item.isLive;
        });

        return {
            total: items.length,
            breaking: this.getBreakingItems().length,
            categories: categories,
            lastUpdated: STATE.breakingNews.lastUpdated,
            hasLiveNews: hasLiveNews,
            source: 'GitHub Raw',
            url: CONFIG.GITHUB_BREAKING_NEWS_URL
        };
    },

    /**
     * Clear breaking news cache
     */
    clearCache: function() {
        Utils.removeFromStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS);
        Utils.removeFromStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS_TIMESTAMP);
        console.log('[BREAKING] Cache cleared');
    },

    /**
     * Check if cache is valid
     */
    isCacheValid: function() {
        var cached = Utils.getFromStorage(
            CONFIG.STORAGE_KEYS.BREAKING_NEWS,
            CONFIG.CACHE_BREAKING_NEWS
        );
        return cached !== null && cached.length > 0;
    },

    /**
     * Initialize Breaking News API module
     */
    init: async function() {
        console.log('[BREAKING] Initializing Breaking News module...');

        try {
            var news = await this.fetchBreakingNews();
            this.updateTickerDOM();
            this.startAutoRefresh();
            console.log('[BREAKING] Initialized with ' + news.length + ' news items');
            return news;

        } catch (error) {
            console.error('[BREAKING] Initialization error:', error);

            var cached = Utils.getFromStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS);
            if (cached && cached.length > 0) {
                StateManager.set('breakingNews.items', cached);
                StateManager.set('breakingNews.isLoaded', true);
                this.updateTickerDOM();
                console.log('[BREAKING] Loaded ' + cached.length + ' items from cache');
                return cached;
            }

            var fallback = this.generateFallbackNews();
            StateManager.set('breakingNews.items', fallback);
            StateManager.set('breakingNews.isLoaded', true);
            this.updateTickerDOM();
            console.log('[BREAKING] Using ' + fallback.length + ' fallback items');
            return fallback;
        }
    },

    /**
     * Cleanup
     */
    destroy: function() {
        this.stopAutoRefresh();
        if (STATE.abortControllers.breakingNewsFetch) {
            STATE.abortControllers.breakingNewsFetch.abort();
        }
        console.log('[BREAKING] Breaking News module destroyed');
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BreakingNewsAPI;
}
