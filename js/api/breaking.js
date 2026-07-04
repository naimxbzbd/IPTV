/*=============================================
  XBZ Prime TV - Breaking News API
  Fetch & Display Breaking News Ticker
  =============================================*/

'use strict';

const BreakingNewsAPI = {
    /* ==========================================
       STATE
       ========================================== */

    breakingNewsUrl: CONFIG.GITHUB_BREAKING_NEWS_URL,
    abortController: null,
    updateInterval: null,

    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize Breaking News API
     */
    async init() {
        console.log('[BREAKING] Initializing Breaking News API...');
        
        try {
            await this.fetchBreakingNews();
            this.setupAutoRefresh();
            
            console.log('[BREAKING] Breaking News API initialized');
        } catch (error) {
            console.error('[BREAKING] Error initializing Breaking News API:', error);
            // Don't throw - breaking news is optional
        }
    },

    /* ==========================================
       FETCH BREAKING NEWS
       ========================================== */

    /**
     * Fetch breaking news
     * @param {boolean} forceRefresh - Force bypass cache
     */
    async fetchBreakingNews(forceRefresh = false) {
        console.log('[BREAKING] Fetching breaking news...');
        
        StateManager.set('breakingNews.isLoading', true);
        
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        
        try {
            // Check cache if not forced
            if (!forceRefresh) {
                const cached = Utils.getFromStorage(
                    CONFIG.STORAGE_KEYS.BREAKING_NEWS,
                    CONFIG.CACHE_BREAKING_NEWS
                );
                
                if (cached && cached.length > 0) {
                    console.log('[BREAKING] Using cached news:', cached.length);
                    StateManager.set('breakingNews.items', cached);
                    StateManager.set('breakingNews.isLoading', false);
                    StateManager.set('breakingNews.isLoaded', true);
                    return cached;
                }
            }
            
            const response = await Utils.fetchWithTimeout(
                this.breakingNewsUrl,
                {},
                10000,
                2
            );
            
            const data = await response.json();
            const items = Array.isArray(data) ? data : data.items || [];
            
            console.log('[BREAKING] Fetched', items.length, 'news items');
            
            // Update state
            StateManager.set('breakingNews.items', items);
            StateManager.set('breakingNews.isLoaded', true);
            StateManager.set('breakingNews.lastUpdated', new Date().toISOString());
            StateManager.set('breakingNews.isLoading', false);
            
            // Cache
            Utils.setToStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS, items);
            Utils.setToStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS_TIMESTAMP, Date.now());
            
            // Trigger event
            Utils.triggerEvent(document.body, 'breaking:loaded', {
                total: items.length,
            });
            
            return items;
        } catch (error) {
            console.error('[BREAKING] Error fetching breaking news:', error);
            
            StateManager.set('breakingNews.error', error.message);
            StateManager.set('breakingNews.isLoading', false);
            
            // Try cache fallback
            const cached = Utils.getFromStorage(CONFIG.STORAGE_KEYS.BREAKING_NEWS);
            if (cached && cached.length > 0) {
                StateManager.set('breakingNews.items', cached);
                StateManager.set('breakingNews.isLoaded', true);
                console.log('[BREAKING] Using', cached.length, 'fallback news items');
                return cached;
            }
            
            // Use generated fallback
            return this.generateFallbackNews();
        }
    },

    /**
     * Generate fallback news
     */
    generateFallbackNews() {
        console.log('[BREAKING] Generating fallback news data');
        
        const fallback = [
            {
                id: 'fallback-1',
                title: 'Welcome to XBZ Prime TV',
                content: 'Premium sports streaming platform',
                category: 'Sports',
                timestamp: new Date().toISOString(),
                priority: 'high',
            },
            {
                id: 'fallback-2',
                title: 'Live Matches Available',
                content: 'Watch football, cricket and more',
                category: 'Sports',
                timestamp: new Date().toISOString(),
                priority: 'high',
            },
            {
                id: 'fallback-3',
                title: 'Multiple Sports Channels',
                content: 'Access to hundreds of live channels',
                category: 'Sports',
                timestamp: new Date().toISOString(),
                priority: 'medium',
            },
        ];
        
        StateManager.set('breakingNews.items', fallback);
        StateManager.set('breakingNews.isLoaded', true);
        
        return fallback;
    },

    /* ==========================================
       AUTO REFRESH
       ========================================== */

    /**
     * Set up auto-refresh
     */
    setupAutoRefresh() {
        this.updateInterval = setInterval(() => {
            console.log('[BREAKING] Auto-refreshing news...');
            this.fetchBreakingNews(true).catch(error => {
                console.error('[BREAKING] Auto-refresh error:', error);
            });
        }, CONFIG.REFRESH_BREAKING_NEWS);
        
        STATE.timers.breakingNewsRefresh = this.updateInterval;
        console.log('[BREAKING] Auto-refresh set up');
    },

    /* ==========================================
       CLEANUP
       ========================================== */

    /**
     * Destroy Breaking News API
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.abortController) {
            this.abortController.abort();
        }
        
        console.log('[BREAKING] Breaking News API destroyed');
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BreakingNewsAPI;
}
