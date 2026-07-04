/*=============================================
  ⚽ XBZ Prime TV - GitHub API Module
  Fetch & Parse Playlist from GitHub Raw URLs
  =============================================*/

'use strict';

const GitHubAPI = {
    /* ==========================================
       FETCH PLAYLIST
       ========================================== */

    /**
     * Fetch playlist from all configured GitHub URLs
     * @param {boolean} force - Force refresh ignoring cache
     * @returns {Promise<Array>} Array of channel objects
     */
    async fetchPlaylist(force = false) {
        // Check cache first
        if (!force) {
            const cached = Utils.getFromStorage(
                CONFIG.STORAGE_KEYS.PLAYLIST,
                CONFIG.CACHE_PLAYLIST
            );
            if (cached && cached.length > 0) {
                console.log('[GITHUB] Using cached playlist');
                return cached;
            }
        }

        // Update loading state
        StateManager.set('playlist.isLoading', true);
        StateManager.set('playlist.error', null);

        try {
            console.log('[GITHUB] Fetching playlists from GitHub...');
            
            // Create abort controller
            const controller = new AbortController();
            STATE.abortControllers.playlistFetch = controller;

            // Fetch all playlists concurrently
            const results = await Promise.allSettled(
                CONFIG.GITHUB_PLAYLIST_URLS.map(url =>
                    this.fetchSinglePlaylist(url, controller.signal)
                )
            );

            // Process results
            let allChannels = [];
            let successCount = 0;
            const errors = [];

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    allChannels = allChannels.concat(result.value);
                    successCount++;
                    console.log(`[GITHUB] Playlist ${index + 1} fetched successfully (${result.value.length} channels)`);
                } else {
                    const error = result.reason || result.value;
                    errors.push(`Source ${index + 1}: ${error?.message || 'Unknown error'}`);
                    console.error(`[GITHUB] Playlist ${index + 1} failed:`, error);
                }
            });

            // If all sources failed, throw error
            if (successCount === 0) {
                throw new Error(`All playlist sources failed:\n${errors.join('\n')}`);
            }

            // Remove duplicates
            const uniqueChannels = Utils.removeDuplicateChannels(allChannels);
            console.log(`[GITHUB] Total unique channels: ${uniqueChannels.length}`);

            // Extract categories
            const categories = Utils.extractCategories(uniqueChannels);
            console.log(`[GITHUB] Categories found: ${categories.length}`);

            // Cache the result
            Utils.setToStorage(CONFIG.STORAGE_KEYS.PLAYLIST, uniqueChannels);
            Utils.setToStorage(CONFIG.STORAGE_KEYS.PLAYLIST_TIMESTAMP, Date.now());

            // Update state
            StateManager.set('playlist.channels', uniqueChannels);
            StateManager.set('playlist.categories', categories);
            StateManager.set('playlist.isLoaded', true);
            StateManager.set('playlist.lastUpdated', new Date().toISOString());
            StateManager.set('playlist.source', CONFIG.GITHUB_PLAYLIST_URLS[0]);
            StateManager.set('playlist.isLoading', false);

            // Trigger event
            Utils.triggerEvent(document.body, 'playlist:loaded', {
                count: uniqueChannels.length,
                categories: categories.length,
            });

            return uniqueChannels;

        } catch (error) {
            console.error('[GITHUB] Error fetching playlist:', error);
            
            StateManager.set('playlist.error', error.message);
            StateManager.set('playlist.isLoading', false);

            // Try to use cached playlist as fallback
            const cached = Utils.getFromStorage(CONFIG.STORAGE_KEYS.PLAYLIST);
            if (cached && cached.length > 0) {
                console.log('[GITHUB] Using cached playlist as fallback');
                StateManager.set('playlist.channels', cached);
                StateManager.set('playlist.categories', Utils.extractCategories(cached));
                StateManager.set('playlist.isLoaded', true);
                return cached;
            }

            throw error;
        }
    },

    /**
     * Fetch a single playlist from URL
     * @param {string} url - Playlist URL
     * @param {AbortSignal} signal - Abort signal
     * @returns {Promise<Array>} Array of channel objects
     */
    async fetchSinglePlaylist(url, signal) {
        try {
            const response = await fetch(url, {
                signal,
                cache: 'no-cache',
                headers: {
                    'Accept': 'text/plain, application/x-mpegurl, */*',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type') || '';
            const text = await response.text();

            if (!text || text.trim().length === 0) {
                throw new Error('Empty playlist response');
            }

            // Check if it's M3U format
            if (text.includes('#EXTM3U') || text.includes('#EXTINF:')) {
                console.log(`[GITHUB] Parsing M3U playlist from ${url}`);
                return Utils.parseM3U(text);
            }

            // Try to parse as JSON (some playlists are in JSON format)
            if (contentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
                try {
                    const json = JSON.parse(text);
                    return this.parseJSONPlaylist(json);
                } catch (e) {
                    // Not valid JSON, try M3U anyway
                    console.log('[GITHUB] Not JSON, attempting M3U parse...');
                    return Utils.parseM3U(text);
                }
            }

            // Try M3U parsing as fallback
            return Utils.parseM3U(text);

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Playlist fetch aborted');
            }
            throw error;
        }
    },

    /**
     * Parse JSON format playlist
     * @param {Object|Array} json - JSON playlist data
     * @returns {Array} Array of channel objects
     */
    parseJSONPlaylist(json) {
        const channels = [];

        try {
            // Handle array format
            if (Array.isArray(json)) {
                json.forEach((item, index) => {
                    if (item.url || item.stream || item.link) {
                        channels.push({
                            id: Utils.generateId('ch'),
                            name: item.name || item.title || item.channel || `Channel ${index + 1}`,
                            url: item.url || item.stream || item.link || '',
                            logo: item.logo || item.icon || item.image || '',
                            group: item.group || item.category || item.genre || 'General',
                            category: Utils.capitalize(item.group || item.category || item.genre || 'General'),
                            quality: item.quality || Utils.detectQuality(
                                (item.name || '') + (item.url || '')
                            ),
                            isLive: item.isLive || item.live || false,
                        });
                    }
                });
            }
            // Handle object format
            else if (typeof json === 'object') {
                const items = json.channels || json.data || json.items || json.streams || [];
                if (Array.isArray(items)) {
                    return this.parseJSONPlaylist(items);
                }
                
                // Object with numbered keys
                Object.entries(json).forEach(([key, value]) => {
                    if (value && typeof value === 'object' && (value.url || value.stream)) {
                        channels.push({
                            id: Utils.generateId('ch'),
                            name: value.name || value.title || key,
                            url: value.url || value.stream || '',
                            logo: value.logo || value.icon || '',
                            group: value.group || value.category || 'General',
                            category: Utils.capitalize(value.group || value.category || 'General'),
                            quality: value.quality || 'HD',
                            isLive: value.isLive || false,
                        });
                    }
                });
            }
        } catch (error) {
            console.error('[GITHUB] Error parsing JSON playlist:', error);
        }

        return channels;
    },

    /* ==========================================
       AUTO REFRESH
       ========================================== */

    /**
     * Start auto-refresh interval for playlist
     */
    startAutoRefresh() {
        this.stopAutoRefresh();
        
        console.log(`[GITHUB] Starting playlist auto-refresh every ${CONFIG.REFRESH_PLAYLIST / 1000}s`);
        
        STATE.timers.playlistRefresh = setInterval(async () => {
            try {
                console.log('[GITHUB] Auto-refreshing playlist...');
                await this.fetchPlaylist(true);
                console.log('[GITHUB] Playlist auto-refreshed successfully');
            } catch (error) {
                console.error('[GITHUB] Auto-refresh failed:', error);
            }
        }, CONFIG.REFRESH_PLAYLIST);
    },

    /**
     * Stop auto-refresh interval
     */
    stopAutoRefresh() {
        if (STATE.timers.playlistRefresh) {
            clearInterval(STATE.timers.playlistRefresh);
            STATE.timers.playlistRefresh = null;
            console.log('[GITHUB] Playlist auto-refresh stopped');
        }
    },

    /* ==========================================
       PLAYLIST URL MANAGEMENT
       ========================================== */

    /**
     * Add a new playlist URL
     * @param {string} url - New playlist URL
     */
    addPlaylistUrl(url) {
        if (!Utils.isValidURL(url)) {
            throw new Error('Invalid URL format');
        }
        
        if (!CONFIG.GITHUB_PLAYLIST_URLS.includes(url)) {
            CONFIG.GITHUB_PLAYLIST_URLS.push(url);
            console.log(`[GITHUB] Added playlist URL: ${url}`);
        }
    },

    /**
     * Remove a playlist URL
     * @param {string} url - URL to remove
     */
    removePlaylistUrl(url) {
        const index = CONFIG.GITHUB_PLAYLIST_URLS.indexOf(url);
        if (index > -1) {
            CONFIG.GITHUB_PLAYLIST_URLS.splice(index, 1);
            console.log(`[GITHUB] Removed playlist URL: ${url}`);
        }
    },

    /**
     * Get all playlist URLs
     * @returns {Array} Playlist URLs
     */
    getPlaylistUrls() {
        return [...CONFIG.GITHUB_PLAYLIST_URLS];
    },

    /* ==========================================
       CHANNEL SEARCH & FILTER
       ========================================== */

    /**
     * Search channels by query
     * @param {string} query - Search query
     * @returns {Array} Matching channels
     */
    searchChannels(query) {
        if (!query || query.trim() === '') {
            return STATE.playlist.channels;
        }

        const searchTerms = query.toLowerCase().trim().split(/\s+/);
        
        return STATE.playlist.channels.filter(channel => {
            const searchText = [
                channel.name,
                channel.category,
                channel.group,
                channel.quality,
            ].join(' ').toLowerCase();
            
            return searchTerms.every(term => searchText.includes(term));
        });
    },

    /**
     * Filter channels by category
     * @param {string} category - Category name
     * @returns {Array} Filtered channels
     */
    filterByCategory(category) {
        if (!category || category === 'all') {
            return STATE.playlist.channels;
        }

        return STATE.playlist.channels.filter(channel =>
            channel.category.toLowerCase() === category.toLowerCase()
        );
    },

    /**
     * Get channel by ID
     * @param {string} id - Channel ID
     * @returns {Object|null} Channel object
     */
    getChannelById(id) {
        return STATE.playlist.channels.find(ch => ch.id === id) || null;
    },

    /**
     * Get channel by index
     * @param {number} index - Channel index
     * @returns {Object|null} Channel object
     */
    getChannelByIndex(index) {
        const channels = STATE.playlist.filteredChannels;
        if (index >= 0 && index < channels.length) {
            return channels[index];
        }
        return null;
    },

    /* ==========================================
       PLAYLIST STATS
       ========================================== */

    /**
     * Get playlist statistics
     * @returns {Object} Stats object
     */
    getStats() {
        const channels = STATE.playlist.channels;
        
        const stats = {
            totalChannels: channels.length,
            totalCategories: STATE.playlist.categories.length,
            liveChannels: channels.filter(ch => ch.isLive).length,
            hdChannels: channels.filter(ch => ch.quality === 'HD').length,
            sdChannels: channels.filter(ch => ch.quality === 'SD').length,
            fourKChannels: channels.filter(ch => ch.quality === '4K').length,
            lastUpdated: STATE.playlist.lastUpdated,
            source: STATE.playlist.source,
        };

        // Channels per category
        stats.channelsPerCategory = {};
        STATE.playlist.categories.forEach(cat => {
            stats.channelsPerCategory[cat] = channels.filter(
                ch => ch.category.toLowerCase() === cat.toLowerCase()
            ).length;
        });

        return stats;
    },

    /* ==========================================
       VALIDATION
       ========================================== */

    /**
     * Validate channel object
     * @param {Object} channel - Channel to validate
     * @returns {boolean} Is valid
     */
    validateChannel(channel) {
        if (!channel || typeof channel !== 'object') return false;
        if (!channel.name || typeof channel.name !== 'string') return false;
        if (!channel.url || !Utils.isValidURL(channel.url)) return false;
        return true;
    },

    /**
     * Clean invalid channels from playlist
     * @returns {Array} Cleaned channels
     */
    cleanPlaylist() {
        const before = STATE.playlist.channels.length;
        const cleaned = STATE.playlist.channels.filter(ch => this.validateChannel(ch));
        const removed = before - cleaned.length;
        
        if (removed > 0) {
            console.log(`[GITHUB] Removed ${removed} invalid channels`);
            StateManager.set('playlist.channels', cleaned);
        }
        
        return cleaned;
    },

    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize GitHub API module
     */
    async init() {
        console.log('[GITHUB] Initializing GitHub API module...');
        
        try {
            // Fetch initial playlist
            const channels = await this.fetchPlaylist();
            
            // Clean invalid channels
            this.cleanPlaylist();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            console.log(`[GITHUB] Initialized with ${channels.length} channels`);
            return channels;
            
        } catch (error) {
            console.error('[GITHUB] Initialization error:', error);
            
            // Try loading from cache
            const cached = Utils.getFromStorage(CONFIG.STORAGE_KEYS.PLAYLIST);
            if (cached && cached.length > 0) {
                StateManager.set('playlist.channels', cached);
                StateManager.set('playlist.categories', Utils.extractCategories(cached));
                StateManager.set('playlist.isLoaded', true);
                console.log(`[GITHUB] Loaded ${cached.length} channels from cache`);
                return cached;
            }
            
            throw error;
        }
    },

    /**
     * Cleanup
     */
    destroy() {
        this.stopAutoRefresh();
        if (STATE.abortControllers.playlistFetch) {
            STATE.abortControllers.playlistFetch.abort();
        }
        console.log('[GITHUB] GitHub API module destroyed');
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubAPI;
}
