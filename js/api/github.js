/*=============================================
  XBZ Prime TV - GitHub API
  Fetch & Parse M3U Playlists from GitHub
  =============================================*/

'use strict';

const GitHubAPI = {
    /* ==========================================
       STATE
       ========================================== */

    playlistUrls: CONFIG.GITHUB_PLAYLIST_URLS,
    abortController: null,
    updateInterval: null,

    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize GitHub API - fetch and parse playlists
     */
    async init() {
        console.log('[GITHUB] Initializing GitHub API...');
        
        try {
            await this.fetchPlaylist();
            
            // Set up auto-refresh
            this.setupAutoRefresh();
            
            console.log('[GITHUB] GitHub API initialized');
        } catch (error) {
            console.error('[GITHUB] Error initializing GitHub API:', error);
            throw error;
        }
    },

    /* ==========================================
       PLAYLIST FETCHING
       ========================================== */

    /**
     * Fetch playlist from GitHub
     * @param {boolean} forceRefresh - Force bypass cache
     */
    async fetchPlaylist(forceRefresh = false) {
        console.log('[GITHUB] Fetching playlist...');
        
        StateManager.set('playlist.isLoading', true);
        
        // Abort any previous requests
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        
        try {
            // Check cache if not forced
            if (!forceRefresh) {
                const cached = Utils.getFromStorage(
                    CONFIG.STORAGE_KEYS.PLAYLIST,
                    CONFIG.CACHE_PLAYLIST
                );
                
                if (cached && cached.length > 0) {
                    console.log('[GITHUB] Using cached playlist:', cached.length, 'channels');
                    StateManager.set('playlist.channels', cached);
                    StateManager.set('playlist.categories', Utils.extractCategories(cached));
                    StateManager.set('playlist.isLoading', false);
                    StateManager.set('playlist.isLoaded', true);
                    StateManager.set('playlist.lastUpdated', new Date().toISOString());
                    return cached;
                }
            }

            let allChannels = [];
            let successCount = 0;

            // Fetch from all URLs
            for (const url of this.playlistUrls) {
                try {
                    console.log('[GITHUB] Fetching from:', url);
                    
                    const response = await Utils.fetchWithTimeout(url, {}, 15000, 2);
                    const text = await response.text();
                    
                    const channels = Utils.parseM3U(text);
                    console.log('[GITHUB] Parsed', channels.length, 'channels from:', url);
                    
                    allChannels = allChannels.concat(channels);
                    successCount++;
                } catch (error) {
                    console.warn('[GITHUB] Failed to fetch from', url, ':', error);
                }
            }

            // Remove duplicates
            allChannels = Utils.removeDuplicateChannels(allChannels);
            
            if (allChannels.length === 0) {
                throw new Error('No channels found in any playlist');
            }

            console.log('[GITHUB] Total channels loaded:', allChannels.length, 'from', successCount, 'sources');

            // Extract categories
            const categories = Utils.extractCategories(allChannels);
            
            // Update state
            StateManager.set('playlist.channels', allChannels);
            StateManager.set('playlist.categories', categories);
            StateManager.set('playlist.isLoaded', true);
            StateManager.set('playlist.lastUpdated', new Date().toISOString());
            StateManager.set('playlist.source', 'github');
            
            // Cache playlist
            Utils.setToStorage(CONFIG.STORAGE_KEYS.PLAYLIST, allChannels);
            Utils.setToStorage(CONFIG.STORAGE_KEYS.PLAYLIST_TIMESTAMP, Date.now());
            
            // Trigger event
            Utils.triggerEvent(document.body, 'playlist:loaded', {
                total: allChannels.length,
                categories: categories.length,
            });

            return allChannels;
        } catch (error) {
            console.error('[GITHUB] Error fetching playlist:', error);
            
            StateManager.set('playlist.error', error.message);
            
            // Try fallback
            return this.getFallbackPlaylist();
        } finally {
            StateManager.set('playlist.isLoading', false);
        }
    },

    /**
     * Get fallback playlist for offline/error states
     */
    getFallbackPlaylist() {
        console.log('[GITHUB] Using fallback playlist');
        
        const fallback = [
            {
                id: Utils.generateId('ch'),
                name: 'Test Stream 1',
                url: 'https://test-streams.com/stream1.m3u8',
                logo: '',
                group: 'Sports',
                category: 'Sports',
                quality: 'HD',
                isLive: true,
            },
            {
                id: Utils.generateId('ch'),
                name: 'Test Stream 2',
                url: 'https://test-streams.com/stream2.m3u8',
                logo: '',
                group: 'Sports',
                category: 'Sports',
                quality: 'HD',
                isLive: true,
            },
        ];
        
        StateManager.set('playlist.channels', fallback);
        StateManager.set('playlist.categories', ['Sports']);
        StateManager.set('playlist.isLoaded', true);
        
        return fallback;
    },

    /* ==========================================
       CHANNEL OPERATIONS
       ========================================== */

    /**
     * Get channel by index
     */
    getChannelByIndex(index) {
        return STATE.playlist.channels[index] || null;
    },

    /**
     * Get channel by ID
     */
    getChannelById(id) {
        return STATE.playlist.channels.find(ch => ch.id === id) || null;
    },

    /**
     * Get channel by name
     */
    getChannelByName(name) {
        return STATE.playlist.channels.find(ch => 
            ch.name.toLowerCase() === name.toLowerCase()
        ) || null;
    },

    /**
     * Get channels by category
     */
    getChannelsByCategory(category) {
        if (category === 'all') {
            return STATE.playlist.channels;
        }
        return STATE.playlist.channels.filter(ch => 
            ch.category.toLowerCase() === category.toLowerCase()
        );
    },

    /**
     * Get playlist statistics
     */
    getStats() {
        return {
            totalCount: STATE.playlist.totalCount,
            categoryCount: STATE.playlist.categories.length,
            lastUpdated: STATE.playlist.lastUpdated,
        };
    },

    /**
     * Search channels
     */
    searchChannels(query) {
        if (!query || query.trim() === '') {
            return STATE.playlist.channels;
        }
        
        const q = query.toLowerCase();
        return STATE.playlist.channels.filter(ch => 
            ch.name.toLowerCase().includes(q) ||
            ch.category.toLowerCase().includes(q) ||
            (ch.group && ch.group.toLowerCase().includes(q))
        );
    },

    /* ==========================================
       AUTO REFRESH
       ========================================== */

    /**
     * Set up auto-refresh of playlist
     */
    setupAutoRefresh() {
        this.updateInterval = setInterval(() => {
            console.log('[GITHUB] Auto-refreshing playlist...');
            this.fetchPlaylist(true).catch(error => {
                console.error('[GITHUB] Auto-refresh error:', error);
            });
        }, CONFIG.REFRESH_PLAYLIST);
        
        STATE.timers.playlistRefresh = this.updateInterval;
        console.log('[GITHUB] Auto-refresh set up');
    },

    /* ==========================================
       CLEANUP
       ========================================== */

    /**
     * Destroy GitHub API
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.abortController) {
            this.abortController.abort();
        }
        
        console.log('[GITHUB] GitHub API destroyed');
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubAPI;
}
