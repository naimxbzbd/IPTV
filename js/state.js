/*=============================================
  ⚽ XBZ Prime TV - State Management
  Centralized Application State
  =============================================*/

'use strict';

const STATE = {
    /* ==========================================
       APP STATE
       ========================================== */

    app: {
        initialized: false,
        ready: false,
        online: navigator.onLine,
        loading: false,
        error: null,
        activeView: 'home', // 'home', 'live', 'scores', 'play-url', 'menu'
        lastActivity: Date.now(),
    },

    /* ==========================================
       THEME STATE
       ========================================== */

    theme: {
        current: 'dark', // 'dark' | 'light'
        systemPreference: null,
    },

    /* ==========================================
       PLAYLIST STATE
       ========================================== */

    playlist: {
        channels: [],               // All parsed channels
        filteredChannels: [],       // Currently filtered channels
        categories: [],             // Unique categories
        selectedCategory: 'all',    // Active category filter
        searchQuery: '',            // Current search text
        totalCount: 0,             // Total channels count
        filteredCount: 0,          // Filtered channels count
        lastUpdated: null,         // Timestamp of last update
        isLoading: false,
        isLoaded: false,
        error: null,
        source: null,              // Which playlist URL was used
    },

    /* ==========================================
       PLAYER STATE
       ========================================== */

    player: {
        videoJS: null,             // Video.js player instance
        hls: null,                 // HLS.js instance
        currentChannel: null,      // Currently playing channel object
        currentSource: null,       // Current active source URL
        currentSourceIndex: 0,     // Index of current source
        availableSources: [],      // All available sources for current channel
        isPlaying: false,
        isPaused: true,
        isMuted: true,
        isFullscreen: false,
        isPiP: false,
        isLoading: false,
        hasError: false,
        errorMessage: '',
        retryCount: 0,
        volume: 0.7,
        playbackRate: 1,
        quality: 'auto',
        currentTime: 0,
        duration: 0,
        buffered: 0,
    },

    /* ==========================================
       FOOTBALL MATCHES STATE
       ========================================== */

    football: {
        matches: [],               // All fetched matches
        liveMatches: [],           // Live matches only
        upcomingMatches: [],       // Upcoming matches
        finishedMatches: [],       // Finished matches
        activeTab: 'live',         // 'live' | 'upcoming' | 'finished'
        isLoading: false,
        isLoaded: false,
        lastUpdated: null,
        error: null,
        cache: {},                 // Cache by competition
    },

    /* ==========================================
       BREAKING NEWS STATE
       ========================================== */

    breakingNews: {
        items: [],
        isLoading: false,
        isLoaded: false,
        lastUpdated: null,
        error: null,
    },

    /* ==========================================
       UI STATE
       ========================================== */

    ui: {
        // Sidebar
        sidebarOpen: false,
        
        // Search
        searchOpen: false,
        searchFocused: false,
        
        // Modals
        sourceModalOpen: false,
        activeModal: null,
        
        // Custom Stream
        customStreamOpen: false,
        customStreamTab: 'direct', // 'direct' | 'm3u' | 'embed'
        
        // Scroll
        scrollPosition: 0,
        showScrollTop: false,
        
        // Toasts
        activeToasts: [],
        maxToasts: 5,
        
        // Loading states
        loadingStates: {
            playlist: false,
            matches: false,
            breakingNews: false,
            player: false,
        },
        
        // Error states
        errors: {
            playlist: null,
            matches: null,
            breakingNews: null,
            player: null,
        },
        
        // Breakpoint
        currentBreakpoint: 'xs',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        
        // Keyboard
        lastKeyPressed: null,
        shortcutsEnabled: true,
    },

    /* ==========================================
       PWA STATE
       ========================================== */

    pwa: {
        installable: false,
        installed: false,
        installPromptEvent: null,
        installBannerDismissed: false,
        serviceWorkerRegistered: false,
        serviceWorkerUpdated: false,
        cacheReady: false,
        updateAvailable: false,
    },

    /* ==========================================
       CUSTOM STREAM STATE
       ========================================== */

    customStream: {
        directUrl: '',
        m3uContent: '',
        embedCode: '',
        parsedM3uChannels: [],
        embedRendered: false,
    },

    /* ==========================================
       DOM CACHE
       ========================================== */

    dom: {
        // Will be populated on init
        elements: {},
        observers: {},
    },

    /* ==========================================
       TIMERS & INTERVALS
       ========================================== */

    timers: {
        playlistRefresh: null,
        breakingNewsRefresh: null,
        footballRefresh: null,
        scoreTickerInterval: null,
        marqueeAnimation: null,
        loadingTimeout: null,
        retryTimeout: null,
        toastTimeouts: [],
    },

    /* ==========================================
       ABORT CONTROLLERS
       ========================================== */

    abortControllers: {
        playlistFetch: null,
        breakingNewsFetch: null,
        footballFetch: null,
        customStreamFetch: null,
    },

    /* ==========================================
       PERFORMANCE METRICS
       ========================================== */

    performance: {
        appStartTime: performance.now(),
        playlistLoadTime: null,
        footballLoadTime: null,
        firstPaint: null,
        firstContentfulPaint: null,
        playerLoadTime: null,
    },
};

/* ==========================================
   STATE MANAGEMENT METHODS
   ========================================== */

const StateManager = {
    /**
     * Get a nested state value by dot-notation path
     * @param {string} path - Dot notation path (e.g., 'player.currentChannel')
     * @returns {*} The value at the path
     */
    get(path) {
        try {
            return path.split('.').reduce((obj, key) => obj[key], STATE);
        } catch (error) {
            console.error(`[STATE] Error getting path "${path}":`, error);
            return undefined;
        }
    },

    /**
     * Set a nested state value by dot-notation path
     * @param {string} path - Dot notation path
     * @param {*} value - Value to set
     */
    set(path, value) {
        try {
            const keys = path.split('.');
            const lastKey = keys.pop();
            const target = keys.reduce((obj, key) => {
                if (!(key in obj)) obj[key] = {};
                return obj[key];
            }, STATE);
            
            const oldValue = target[lastKey];
            target[lastKey] = value;
            
            // Trigger change handler if value actually changed
            if (oldValue !== value) {
                StateManager.onChange(path, value, oldValue);
            }
        } catch (error) {
            console.error(`[STATE] Error setting path "${path}":`, error);
        }
    },

    /**
     * Update multiple state values at once
     * @param {Object} updates - Object with path:value pairs
     */
    update(updates) {
        Object.entries(updates).forEach(([path, value]) => {
            StateManager.set(path, value);
        });
    },

    /**
     * Reset a state branch to its default
     * @param {string} path - Path to reset
     */
    reset(path) {
        const defaultState = StateManager.getDefaultState();
        const keys = path.split('.');
        let defaultValue = defaultState;
        
        for (const key of keys) {
            if (defaultValue && key in defaultValue) {
                defaultValue = defaultValue[key];
            } else {
                defaultValue = undefined;
                break;
            }
        }
        
        if (defaultValue !== undefined) {
            StateManager.set(path, JSON.parse(JSON.stringify(defaultValue)));
        }
    },

    /**
     * Get the initial default state
     * @returns {Object} Deep clone of initial state
     */
    getDefaultState() {
        return {
            app: {
                initialized: false,
                ready: false,
                online: true,
                loading: false,
                error: null,
                activeView: 'home',
                lastActivity: Date.now(),
            },
            theme: {
                current: 'dark',
                systemPreference: null,
            },
            playlist: {
                channels: [],
                filteredChannels: [],
                categories: [],
                selectedCategory: 'all',
                searchQuery: '',
                totalCount: 0,
                filteredCount: 0,
                lastUpdated: null,
                isLoading: false,
                isLoaded: false,
                error: null,
                source: null,
            },
            player: {
                videoJS: null,
                hls: null,
                currentChannel: null,
                currentSource: null,
                currentSourceIndex: 0,
                availableSources: [],
                isPlaying: false,
                isPaused: true,
                isMuted: true,
                isFullscreen: false,
                isPiP: false,
                isLoading: false,
                hasError: false,
                errorMessage: '',
                retryCount: 0,
                volume: 0.7,
                playbackRate: 1,
                quality: 'auto',
                currentTime: 0,
                duration: 0,
                buffered: 0,
            },
        };
    },

    /**
     * Subscribe to state changes
     * @param {string} path - Path to watch
     * @param {Function} callback - Called with (newValue, oldValue)
     * @returns {Function} Unsubscribe function
     */
    onChange(path, newValue, oldValue) {
        // Dispatch custom event for the path
        const event = new CustomEvent('statechange', {
            detail: {
                path,
                newValue,
                oldValue,
            },
            bubbles: true,
        });
        
        if (STATE.dom.elements.app) {
            STATE.dom.elements.app.dispatchEvent(event);
        }
        
        // Specific path handlers
        StateManager.handleSpecificChanges(path, newValue, oldValue);
    },

    /**
     * Handle specific state changes with side effects
     */
    handleSpecificChanges(path, newValue, oldValue) {
        switch (path) {
            case 'theme.current':
                document.documentElement.setAttribute('data-theme', newValue);
                localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, newValue);
                break;
                
            case 'app.online':
                if (newValue !== oldValue) {
                    if (newValue) {
                        window.dispatchEvent(new CustomEvent('app:online'));
                    } else {
                        window.dispatchEvent(new CustomEvent('app:offline'));
                    }
                }
                break;
                
            case 'playlist.channels':
                STATE.playlist.totalCount = newValue.length;
                STATE.playlist.filteredChannels = StateManager.filterChannels();
                STATE.playlist.filteredCount = STATE.playlist.filteredChannels.length;
                break;
                
            case 'playlist.selectedCategory':
            case 'playlist.searchQuery':
                STATE.playlist.filteredChannels = StateManager.filterChannels();
                STATE.playlist.filteredCount = STATE.playlist.filteredChannels.length;
                break;
                
            case 'football.matches':
                STATE.football.liveMatches = newValue.filter(m => 
                    m.status === 'LIVE' || m.status === 'IN_PLAY' || m.status === 'PAUSED'
                );
                STATE.football.upcomingMatches = newValue.filter(m => 
                    m.status === 'SCHEDULED' || m.status === 'TIMED'
                );
                STATE.football.finishedMatches = newValue.filter(m => 
                    m.status === 'FINISHED'
                );
                break;
        }
    },

    /**
     * Filter channels based on category and search query
     * @returns {Array} Filtered channels
     */
    filterChannels() {
        let filtered = [...STATE.playlist.channels];
        
        // Filter by category
        if (STATE.playlist.selectedCategory !== 'all') {
            filtered = filtered.filter(channel => 
                channel.category.toLowerCase() === STATE.playlist.selectedCategory.toLowerCase()
            );
        }
        
        // Filter by search query
        if (STATE.playlist.searchQuery.trim()) {
            const query = STATE.playlist.searchQuery.toLowerCase().trim();
            filtered = filtered.filter(channel => 
                channel.name.toLowerCase().includes(query) ||
                channel.category.toLowerCase().includes(query) ||
                (channel.group && channel.group.toLowerCase().includes(query))
            );
        }
        
        return filtered;
    },

    /**
     * Get current state snapshot
     * @returns {Object} Deep clone of current state
     */
    getSnapshot() {
        try {
            return JSON.parse(JSON.stringify(STATE));
        } catch (error) {
            console.error('[STATE] Error creating snapshot:', error);
            return null;
        }
    },

    /**
     * Restore state from snapshot
     * @param {Object} snapshot - Previously saved snapshot
     */
    restoreSnapshot(snapshot) {
        if (!snapshot) return;
        
        try {
            // Only restore safe properties
            const safeKeys = ['theme', 'player.volume', 'player.isMuted', 'ui.customStreamTab'];
            safeKeys.forEach(key => {
                const value = key.split('.').reduce((obj, k) => obj?.[k], snapshot);
                if (value !== undefined) {
                    StateManager.set(key, value);
                }
            });
        } catch (error) {
            console.error('[STATE] Error restoring snapshot:', error);
        }
    },

    /**
     * Clear all timers and intervals
     */
    clearAllTimers() {
        Object.values(STATE.timers).forEach(timer => {
            if (timer) {
                if (Array.isArray(timer)) {
                    timer.forEach(t => {
                        if (t && typeof t === 'number') {
                            clearTimeout(t);
                            clearInterval(t);
                        }
                    });
                } else if (typeof timer === 'number') {
                    clearTimeout(timer);
                    clearInterval(timer);
                }
            }
        });
        
        STATE.timers = {
            playlistRefresh: null,
            breakingNewsRefresh: null,
            footballRefresh: null,
            scoreTickerInterval: null,
            marqueeAnimation: null,
            loadingTimeout: null,
            retryTimeout: null,
            toastTimeouts: [],
        };
    },

    /**
     * Abort all pending fetch requests
     */
    abortAllFetches() {
        Object.values(STATE.abortControllers).forEach(controller => {
            if (controller && !controller.signal.aborted) {
                controller.abort();
            }
        });
        
        STATE.abortControllers = {
            playlistFetch: null,
            breakingNewsFetch: null,
            footballFetch: null,
            customStreamFetch: null,
        };
    },

    /**
     * Initialize state from localStorage
     */
    initFromStorage() {
        try {
            // Restore theme
            const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
            if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
                STATE.theme.current = savedTheme;
            }
            
            // Restore last channel
            const lastChannel = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_CHANNEL);
            if (lastChannel) {
                try {
                    const parsed = JSON.parse(lastChannel);
                    STATE.player.currentChannel = parsed;
                } catch (e) {
                    // Ignore parse error
                }
            }
            
            // Restore user preferences
            const preferences = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_PREFERENCES);
            if (preferences) {
                try {
                    const parsed = JSON.parse(preferences);
                    if (parsed.volume !== undefined) STATE.player.volume = parsed.volume;
                    if (parsed.isMuted !== undefined) STATE.player.isMuted = parsed.isMuted;
                } catch (e) {
                    // Ignore parse error
                }
            }
            
            // Restore install banner state
            const installDismissed = localStorage.getItem(CONFIG.STORAGE_KEYS.INSTALL_PROMPT_SHOWN);
            if (installDismissed) {
                STATE.pwa.installBannerDismissed = true;
            }
            
        } catch (error) {
            console.error('[STATE] Error initializing from storage:', error);
        }
    },

    /**
     * Save critical state to localStorage
     */
    persistState() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, STATE.theme.current);
            
            if (STATE.player.currentChannel) {
                localStorage.setItem(
                    CONFIG.STORAGE_KEYS.LAST_CHANNEL,
                    JSON.stringify({
                        name: STATE.player.currentChannel.name,
                        category: STATE.player.currentChannel.category,
                        logo: STATE.player.currentChannel.logo,
                    })
                );
            }
            
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify({
                volume: STATE.player.volume,
                isMuted: STATE.player.isMuted,
            }));
            
        } catch (error) {
            console.error('[STATE] Error persisting state:', error);
        }
    },

    /**
     * Destroy state and cleanup
     */
    destroy() {
        StateManager.clearAllTimers();
        StateManager.abortAllFetches();
        StateManager.persistState();
    },
};

// Initialize state from storage
StateManager.initFromStorage();

// Handle online/offline events
window.addEventListener('online', () => {
    StateManager.set('app.online', true);
    console.log('[STATE] App is online');
});

window.addEventListener('offline', () => {
    StateManager.set('app.online', false);
    console.log('[STATE] App is offline');
});

// Persist state before page unload
window.addEventListener('beforeunload', () => {
    StateManager.destroy();
});

// Handle visibility change for activity tracking
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        StateManager.set('app.lastActivity', Date.now());
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { STATE, StateManager };
}
