/*=============================================
  ⚽ XBZ Prime TV - Breaking News API Module
  Fetch Breaking News from GitHub Raw JSON
  =============================================*/

'use strict';

const BreakingNewsAPI = {
    /* ==========================================
       FETCH BREAKING NEWS
       ========================================== */

    /**
     * Fetch breaking news from GitHub raw URL
     * @param {boolean} force - Force refresh ignoring cache
     * @returns {Promise<Array>} Array of news items
     */
    async fetchBreakingNews(force = false) {
        // Check cache first
        if (!force) {
            const cached = Utils.getFromStorage(
                CONFIG.STORAGE_KEYS.BREAKING_NEWS,
                CONFIG.CACHE_BREAKING_NEWS
            );
            if (cached && cached.length > 0) {
                console.log('[BREAKING] Using cached breaking news');
                return cached;
            }
        }

        // Update loading state
        StateManager.set('breakingNews.isLoading', true);
        StateManager.set('breakingNews.error', null);

        try {
            console.log('[BREAKING] Fetching breaking news from GitHub...');

            // Create abort controller
            const controller = new AbortController();
            STATE.abortControllers.breakingNewsFetch = controller;

            const response = await fetch(CONFIG.GITHUB_BREAKING_NEWS_URL, {
                signal: controller.signal,
                cache: 'no-cache',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type') || '';
            let data;

            if (contentType.includes('json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    throw new Error('Invalid JSON response');
                }
            }

            // Process news items
            const newsItems = this.processNewsData(data);
            console.log(`[BREAKING] Fetched ${newsItems.length} news items`);

            // Cache the result
            Utils.setToStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS, newsItems);
            Utils.setToStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS_TIMESTAMP, Date.now());

            // Update state
            StateManager.set('breakingNews.items', newsItems);
            StateManager.set('breakingNews.isLoaded', true);
            StateManager.set('breakingNews.lastUpdated', new Date().toISOString());
            StateManager.set('breakingNews.isLoading', false);

            // Trigger event
            Utils.triggerEvent(document.body, 'breakingnews:loaded', {
                count: newsItems.length,
            });

            return newsItems;

        } catch (error) {
            console.error('[BREAKING] Error fetching breaking news:', error);

            StateManager.set('breakingNews.error', error.message);
            StateManager.set('breakingNews.isLoading', false);

            // Try cache fallback
            const cached = Utils.getFromStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS);
            if (cached && cached.length > 0) {
                console.log('[BREAKING] Using cached breaking news as fallback');
                StateManager.set('breakingNews.items', cached);
                StateManager.set('breakingNews.isLoaded', true);
                return cached;
            }

            // Use fallback news
            const fallback = this.generateFallbackNews();
            StateManager.set('breakingNews.items', fallback);
            StateManager.set('breakingNews.isLoaded', true);
            return fallback;
        }
    },

    /**
     * Process raw news data into normalized format
     * @param {*} data - Raw data from API
     * @returns {Array} Processed news items
     */
    processNewsData(data) {
        try {
            let items = [];

            // Handle array format
            if (Array.isArray(data)) {
                items = data;
            }
            // Handle object with items/breaking/data/news property
            else if (typeof data === 'object' && data !== null) {
                items = data.breaking || data.news || data.items || data.data || [];
                if (!Array.isArray(items)) {
                    items = [data];
                }
            }

            // Normalize each item
            return items
                .map((item, index) => this.normalizeNewsItem(item, index))
                .filter(item => item !== null && item.title && item.title.trim());

        } catch (error) {
            console.error('[BREAKING] Error processing news data:', error);
            return [];
        }
    },

    /**
     * Normalize a single news item
     * @param {*} item - Raw news item
     * @param {number} index - Item index
     * @returns {Object|null} Normalized news item
     */
    normalizeNewsItem(item, index) {
        try {
            if (!item) return null;

            // Handle string items
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
                };
            }

            // Handle object items
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
                    image: item.image || item.thumbnail || null,
                };
            }

            return null;

        } catch (error) {
            console.error('[BREAKING] Error normalizing news item:', error);
            return null;
        }
    },

    /* ==========================================
       NEWS FILTERING
       ========================================== */

    /**
     * Get breaking/live news only
     * @returns {Array} Breaking news items
     */
    getBreakingItems() {
        return STATE.breakingNews.items.filter(item =>
            item.isLive || item.priority === 'high' || item.priority === 'breaking'
        );
    },

    /**
     * Get news by category
     * @param {string} category - Category name
     * @returns {Array} Filtered news items
     */
    getNewsByCategory(category) {
        return STATE.breakingNews.items.filter(item =>
            item.category.toLowerCase() === category.toLowerCase()
        );
    },

    /**
     * Get recent news
     * @param {number} count - Number of items
     * @returns {Array} Recent news items
     */
    getRecentNews(count = 10) {
        return [...STATE.breakingNews.items]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, count);
    },

    /* ==========================================
       TICKER FORMATTING
       ========================================== */

    /**
     * Format news for marquee ticker display
     * @returns {Array} Formatted ticker items
     */
    getTickerItems() {
        const items = STATE.breakingNews.items;
        
        if (items.length === 0) {
            return [{
                id: 'default',
                text: 'Welcome to XBZ Prime TV - Premium Sports Live Streaming ⚽',
                isLive: false,
                priority: 'normal',
            }];
        }

        return items.map(item => ({
            id: item.id,
            text: item.title,
            url: item.url,
            isLive: item.isLive,
            priority: item.priority,
            category: item.category,
        }));
    },

    /**
     * Generate HTML for ticker content
     * @returns {string} HTML string for ticker
     */
    generateTickerHTML() {
        const items = this.getTickerItems();
        
        if (items.length === 0) {
            return '<span class="ticker-item">No breaking news available</span>';
        }

        // Duplicate items for seamless marquee
        const duplicatedItems = [];
        for (let i = 0; i < CONFIG.UI.MARQUEE_DUPLICATE_COUNT; i++) {
            duplicatedItems.push(...items);
        }

        return duplicatedItems.map((item, index) => {
            const separator = index > 0 ? '<span class="ticker-separator">|</span>' : '';
            const liveBadge = item.isLive ? '<span class="live-dot"></span> ' : '';
            const link = item.url ? `href="${item.url}" target="_blank" rel="noopener"` : '';
            const content = item.url 
                ? `<a ${link}>${Utils.escapeHTML(item.text)}</a>`
                : Utils.escapeHTML(item.text);

            return `${separator}<span class="ticker-item">${liveBadge}${content}</span>`;
        }).join('');
    },

    /* ==========================================
       AUTO REFRESH
       ========================================== */

    /**
     * Start auto-refresh for breaking news
     */
    startAutoRefresh() {
        this.stopAutoRefresh();
        
        console.log(`[BREAKING] Starting auto-refresh every ${CONFIG.REFRESH_BREAKING_NEWS / 1000}s`);
        
        STATE.timers.breakingNewsRefresh = setInterval(async () => {
            try {
                console.log('[BREAKING] Auto-refreshing breaking news...');
                await this.fetchBreakingNews(true);
                console.log('[BREAKING] Breaking news auto-refreshed successfully');
                
                // Update ticker in DOM if it exists
                this.updateTickerDOM();
            } catch (error) {
                console.error('[BREAKING] Auto-refresh failed:', error);
            }
        }, CONFIG.REFRESH_BREAKING_NEWS);
    },

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (STATE.timers.breakingNewsRefresh) {
            clearInterval(STATE.timers.breakingNewsRefresh);
            STATE.timers.breakingNewsRefresh = null;
            console.log('[BREAKING] Auto-refresh stopped');
        }
    },

    /**
     * Update ticker DOM element with latest news
     */
    updateTickerDOM() {
        try {
            const tickerContent = Utils.$('#ticker-content');
            if (tickerContent) {
                tickerContent.innerHTML = this.generateTickerHTML();
            }
        } catch (error) {
            console.error('[BREAKING] Error updating ticker DOM:', error);
        }
    },

    /* ==========================================
       FALLBACK DATA
       ========================================== */

    /**
     * Generate fallback news for offline/error states
     * @returns {Array} Fallback news items
     */
    generateFallbackNews() {
        console.log('[BREAKING] Generating fallback news data');
        
        return [
            {
                id: 'fallback-1',
                title: '⚽ Welcome to XBZ Prime TV - Your Premium Sports Streaming Platform',
                content: 'Watch live sports from around the world on XBZ Prime TV.',
                url: null,
                category: 'Sports',
                timestamp: new Date().toISOString(),
                priority: 'high',
                isLive: true,
                source: 'XBZ Prime TV',
            },
            {
                id: 'fallback-2',
                title: '📺 Multiple Sports Channels Available - Football, Cricket & More',
                content: 'Access hundreds of live sports channels in HD quality.',
                url: null,
                category: 'Sports',
                timestamp: new Date().toISOString(),
                priority: 'normal',
                isLive: false,
                source: 'XBZ Prime TV',
            },
            {
                id: 'fallback-3',
                title: '🔥 Live Scores Updated Automatically - Stay Connected',
                content: 'Real-time football scores and match updates available.',
                url: null,
                category: 'Football',
                timestamp: new Date().toISOString(),
                priority: 'normal',
                isLive: true,
                source: 'XBZ Prime TV',
            },
            {
                id: 'fallback-4',
                title: '📱 Install XBZ Prime TV as PWA for the Best Experience',
                content: 'Add to home screen for quick access to live sports.',
                url: null,
                category: 'App',
                timestamp: new Date().toISOString(),
                priority: 'normal',
                isLive: false,
                source: 'XBZ Prime TV',
            },
            {
                id: 'fallback-5',
                title: '🌍 Stream from Multiple Sources - Auto Failover Support',
                content: 'If one stream fails, automatically try the next available source.',
                url: null,
                category: 'Tech',
                timestamp: new Date().toISOString(),
                priority: 'normal',
                isLive: false,
                source: 'XBZ Prime TV',
            },
        ];
    },

    /* ==========================================
       NEWS SEARCH
       ========================================== */

    /**
     * Search news items
     * @param {string} query - Search query
     * @returns {Array} Matching news items
     */
    searchNews(query) {
        if (!query || query.trim() === '') {
            return STATE.breakingNews.items;
        }

        const searchTerms = query.toLowerCase().trim().split(/\s+/);
        
        return STATE.breakingNews.items.filter(item => {
            const searchText = [
                item.title,
                item.content,
                item.category,
                item.source,
            ].join(' ').toLowerCase();
            
            return searchTerms.every(term => searchText.includes(term));
        });
    },

    /* ==========================================
       STATISTICS
       ========================================== */

    /**
     * Get breaking news statistics
     * @returns {Object} Stats object
     */
    getStats() {
        const items = STATE.breakingNews.items;
        
        return {
            total: items.length,
            breaking: this.getBreakingItems().length,
            categories: [...new Set(items.map(i => i.category))],
            lastUpdated: STATE.breakingNews.lastUpdated,
            hasLiveNews: items.some(i => i.isLive),
            source: 'GitHub Raw',
            url: CONFIG.GITHUB_BREAKING_NEWS_URL,
        };
    },

    /* ==========================================
       CACHE MANAGEMENT
       ========================================== */

    /**
     * Clear breaking news cache
     */
    clearCache() {
        Utils.removeFromStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS);
        Utils.removeFromStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS_TIMESTAMP);
        console.log('[BREAKING] Cache cleared');
    },

    /**
     * Check if cache is valid
     * @returns {boolean}
     */
    isCacheValid() {
        const cached = Utils.getFromStorage(
            CONFIG.STORAGE_KEYS.BREAKING_NEWS,
            CONFIG.CACHE_BREAKING_NEWS
        );
        return cached !== null && cached.length > 0;
    },

    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize Breaking News API module
     */
    async init() {
        console.log('[BREAKING] Initializing Breaking News module...');
        
        try {
            // Fetch initial news
            const news = await this.fetchBreakingNews();
            
            // Update ticker DOM
            this.updateTickerDOM();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            console.log(`[BREAKING] Initialized with ${news.length} news items`);
            return news;
            
        } catch (error) {
            console.error('[BREAKING] Initialization error:', error);
            
            // Try cache
            const cached = Utils.getFromStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS);
            if (cached && cached.length > 0) {
                StateManager.set('breakingNews.items', cached);
                StateManager.set('breakingNews.isLoaded', true);
                this.updateTickerDOM();
                console.log(`[BREAKING] Loaded ${cached.length} items from cache`);
                return cached;
            }
            
            // Use fallback
            const fallback = this.generateFallbackNews();
            StateManager.set('breakingNews.items', fallback);
            StateManager.set('breakingNews.isLoaded', true);
            this.updateTickerDOM();
            console.log(`[BREAKING] Using ${fallback.length} fallback items`);
            return fallback;
        }
    },

    /**
     * Cleanup
     */
    destroy() {
        this.stopAutoRefresh();
        if (STATE.abortControllers.breakingNewsFetch) {
            STATE.abortControllers.breakingNewsFetch.abort();
        }
        console.log('[BREAKING] Breaking News module destroyed');
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BreakingNewsAPI;
}
