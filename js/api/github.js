/*=============================================
  XBZ Prime TV - GitHub API Module
  Fetch & Parse Playlist from GitHub Raw URLs
  =============================================*/

'use strict';

var GitHubAPI = {
    /**
     * Fetch playlist from all configured GitHub URLs
     */
    fetchPlaylist: async function(force) {
        if (force === undefined) force = false;

        if (!force) {
            var cached = Utils.getFromStorage(
                CONFIG.STORAGE_KEYS.PLAYLIST,
                CONFIG.CACHE_PLAYLIST
            );
            if (cached && cached.length > 0) {
                console.log('[GITHUB] Using cached playlist');
                return cached;
            }
        }

        StateManager.set('playlist.isLoading', true);
        StateManager.set('playlist.error', null);

        try {
            console.log('[GITHUB] Fetching playlists from GitHub...');
            
            var controller = new AbortController();
            STATE.abortControllers.playlistFetch = controller;

            var self = this;
            var promises = CONFIG.GITHUB_PLAYLIST_URLS.map(function(url) {
                return self.fetchSinglePlaylist(url, controller.signal);
            });

            var results = await Promise.allSettled(promises);

            var allChannels = [];
            var successCount = 0;
            var errors = [];

            results.forEach(function(result, index) {
                if (result.status === 'fulfilled' && result.value) {
                    allChannels = allChannels.concat(result.value);
                    successCount++;
                    console.log('[GITHUB] Playlist ' + (index + 1) + ' fetched: ' + result.value.length + ' channels');
                } else {
                    var error = result.reason || result.value;
                    errors.push('Source ' + (index + 1) + ': ' + (error && error.message ? error.message : 'Unknown error'));
                    console.error('[GITHUB] Playlist ' + (index + 1) + ' failed:', error);
                }
            });

            if (successCount === 0) {
                throw new Error('All playlist sources failed:\n' + errors.join('\n'));
            }

            var uniqueChannels = Utils.removeDuplicateChannels(allChannels);
            console.log('[GITHUB] Total unique channels: ' + uniqueChannels.length);

            var categories = Utils.extractCategories(uniqueChannels);
            console.log('[GITHUB] Categories found: ' + categories.length);

            Utils.setToStorage(CONFIG.STORAGE_KEYS.PLAYLIST, uniqueChannels);
            Utils.setToStorage(CONFIG.STORAGE_KEYS.PLAYLIST_TIMESTAMP, Date.now());

            StateManager.set('playlist.channels', uniqueChannels);
            StateManager.set('playlist.categories', categories);
            StateManager.set('playlist.isLoaded', true);
            StateManager.set('playlist.lastUpdated', new Date().toISOString());
            StateManager.set('playlist.source', CONFIG.GITHUB_PLAYLIST_URLS[0]);
            StateManager.set('playlist.isLoading', false);

            Utils.triggerEvent(document.body, 'playlist:loaded', {
                count: uniqueChannels.length,
                categories: categories.length
            });

            return uniqueChannels;

        } catch (error) {
            console.error('[GITHUB] Error fetching playlist:', error);
            
            StateManager.set('playlist.error', error.message);
            StateManager.set('playlist.isLoading', false);

            var cached = Utils.getFromStorage(CONFIG.STORAGE_KEYS.PLAYLIST);
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
     */
    fetchSinglePlaylist: async function(url, signal) {
        try {
            var response;
            var usedProxy = false;
            
            try {
                response = await fetch(url, {
                    signal: signal,
                    cache: 'no-cache',
                    mode: 'cors',
                    headers: {
                        'Accept': 'text/plain, application/x-mpegurl, */*'
                    }
                });
                console.log('[GITHUB] Direct fetch successful for: ' + url.substring(0, 60) + '...');
            } catch (directError) {
                console.log('[GITHUB] Direct fetch failed, error:', directError.message);
                
                if (CONFIG.CORS_PROXY) {
                    console.log('[GITHUB] Trying CORS proxy...');
                    var proxyUrl = CONFIG.CORS_PROXY + encodeURIComponent(url);
                    response = await fetch(proxyUrl, {
                        signal: signal,
                        cache: 'no-cache',
                        headers: {
                            'Accept': 'text/plain, application/x-mpegurl, */*'
                        }
                    });
                    usedProxy = true;
                    console.log('[GITHUB] Proxy fetch successful');
                } else {
                    throw directError;
                }
            }

            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }

            var contentType = response.headers.get('content-type') || '';
            var text = await response.text();

            if (!text || text.trim().length === 0) {
                throw new Error('Empty playlist response');
            }

            console.log('[GITHUB] Playlist fetched ' + (usedProxy ? 'via proxy' : 'directly') + ' - ' + text.length + ' bytes');

            if (text.indexOf('#EXTM3U') !== -1 || text.indexOf('#EXTINF:') !== -1) {
                console.log('[GITHUB] Parsing as M3U playlist');
                return Utils.parseM3U(text);
            }

            if (contentType.indexOf('json') !== -1 || text.trim().charAt(0) === '{' || text.trim().charAt(0) === '[') {
                try {
                    var json = JSON.parse(text);
                    return this.parseJSONPlaylist(json);
                } catch (e) {
                    console.log('[GITHUB] JSON parse failed, trying M3U...');
                    return Utils.parseM3U(text);
                }
            }

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
     */
    parseJSONPlaylist: function(json) {
        var channels = [];
        try {
            if (Array.isArray(json)) {
                json.forEach(function(item, index) {
                    if (item.url || item.stream || item.link) {
                        channels.push({
                            id: Utils.generateId('ch'),
                            name: item.name || item.title || item.channel || ('Channel ' + (index + 1)),
                            url: item.url || item.stream || item.link || '',
                            logo: item.logo || item.icon || item.image || '',
                            group: item.group || item.category || item.genre || 'General',
                            category: Utils.capitalize(item.group || item.category || item.genre || 'General'),
                            quality: item.quality || Utils.detectQuality((item.name || '') + (item.url || '')),
                            isLive: item.isLive || item.live || false
                        });
                    }
                });
            } else if (typeof json === 'object' && json !== null) {
                var items = json.channels || json.data || json.items || json.streams || [];
                if (Array.isArray(items)) {
                    return this.parseJSONPlaylist(items);
                }
                Object.keys(json).forEach(function(key) {
                    var value = json[key];
                    if (value && typeof value === 'object' && (value.url || value.stream)) {
                        channels.push({
                            id: Utils.generateId('ch'),
                            name: value.name || value.title || key,
                            url: value.url || value.stream || '',
                            logo: value.logo || value.icon || '',
                            group: value.group || value.category || 'General',
                            category: Utils.capitalize(value.group || value.category || 'General'),
                            quality: value.quality || 'HD',
                            isLive: value.isLive || false
                        });
                    }
                });
            }
        } catch (error) {
            console.error('[GITHUB] Error parsing JSON playlist:', error);
        }
        return channels;
    },

    /**
     * Start auto-refresh interval for playlist
     */
    startAutoRefresh: function() {
        this.stopAutoRefresh();
        console.log('[GITHUB] Starting auto-refresh every ' + (CONFIG.REFRESH_PLAYLIST / 1000) + 's');
        
        var self = this;
        STATE.timers.playlistRefresh = setInterval(async function() {
            try {
                console.log('[GITHUB] Auto-refreshing playlist...');
                await self.fetchPlaylist(true);
                console.log('[GITHUB] Auto-refresh complete');
            } catch (error) {
                console.error('[GITHUB] Auto-refresh failed:', error);
            }
        }, CONFIG.REFRESH_PLAYLIST);
    },

    /**
     * Stop auto-refresh interval
     */
    stopAutoRefresh: function() {
        if (STATE.timers.playlistRefresh) {
            clearInterval(STATE.timers.playlistRefresh);
            STATE.timers.playlistRefresh = null;
            console.log('[GITHUB] Auto-refresh stopped');
        }
    },

    /**
     * Get channel by ID
     */
    getChannelById: function(id) {
        var found = null;
        STATE.playlist.channels.forEach(function(ch) {
            if (ch.id === id) found = ch;
        });
        return found;
    },

    /**
     * Get channel by index from filtered list
     */
    getChannelByIndex: function(index) {
        var channels = STATE.playlist.filteredChannels;
        if (index >= 0 && index < channels.length) {
            return channels[index];
        }
        return null;
    },

    /**
     * Get playlist statistics
     */
    getStats: function() {
        var channels = STATE.playlist.channels;
        var stats = {
            totalChannels: channels.length,
            totalCategories: STATE.playlist.categories.length,
            liveChannels: channels.filter(function(ch) { return ch.isLive; }).length,
            hdChannels: channels.filter(function(ch) { return ch.quality === 'HD'; }).length,
            lastUpdated: STATE.playlist.lastUpdated,
            source: STATE.playlist.source
        };

        stats.channelsPerCategory = {};
        STATE.playlist.categories.forEach(function(cat) {
            stats.channelsPerCategory[cat] = channels.filter(function(ch) {
                return ch.category.toLowerCase() === cat.toLowerCase();
            }).length;
        });

        return stats;
    },

    /**
     * Initialize GitHub API module
     */
    init: async function() {
        console.log('[GITHUB] Initializing...');
        try {
            var channels = await this.fetchPlaylist();
            this.startAutoRefresh();
            console.log('[GITHUB] Initialized with ' + channels.length + ' channels');
            return channels;
        } catch (error) {
            console.error('[GITHUB] Init error:', error);
            var cached = Utils.getFromStorage(CONFIG.STORAGE_KEYS.PLAYLIST);
            if (cached && cached.length > 0) {
                StateManager.set('playlist.channels', cached);
                StateManager.set('playlist.categories', Utils.extractCategories(cached));
                StateManager.set('playlist.isLoaded', true);
                console.log('[GITHUB] Loaded ' + cached.length + ' channels from cache');
                return cached;
            }
            throw error;
        }
    },

    /**
     * Cleanup
     */
    destroy: function() {
        this.stopAutoRefresh();
        if (STATE.abortControllers.playlistFetch) {
            STATE.abortControllers.playlistFetch.abort();
        }
        console.log('[GITHUB] Destroyed');
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubAPI;
}
