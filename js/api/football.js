/*=============================================
  XBZ Prime TV - Football Data API
  Fetch Live Scores & Match Information
  =============================================*/

'use strict';

const FootballAPI = {
    /* ==========================================
       STATE
       ========================================== */

    apiBase: CONFIG.FOOTBALL_API_BASE_URL,
    apiKey: CONFIG.FOOTBALL_API_KEY,
    abortController: null,
    updateInterval: null,

    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize Football API
     */
    async init() {
        console.log('[FOOTBALL] Initializing Football API...');
        
        try {
            await this.fetchMatches();
            this.setupAutoRefresh();
            
            console.log('[FOOTBALL] Football API initialized');
        } catch (error) {
            console.error('[FOOTBALL] Error initializing Football API:', error);
            // Don't throw - football data is optional
        }
    },

    /* ==========================================
       FETCH MATCHES
       ========================================== */

    /**
     * Fetch matches from Football Data API
     * @param {boolean} forceRefresh - Force bypass cache
     */
    async fetchMatches(forceRefresh = false) {
        console.log('[FOOTBALL] Fetching football matches...');
        
        StateManager.set('football.isLoading', true);
        
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        
        try {
            // Check cache if not forced
            if (!forceRefresh) {
                const cached = Utils.getFromStorage(
                    CONFIG.STORAGE_KEYS.FOOTBALL_MATCHES,
                    CONFIG.CACHE_FOOTBALL_MATCHES
                );
                
                if (cached && cached.length > 0) {
                    console.log('[FOOTBALL] Using cached matches:', cached.length);
                    StateManager.set('football.matches', cached);
                    StateManager.set('football.isLoading', false);
                    StateManager.set('football.isLoaded', true);
                    return cached;
                }
            }

            // Build date range
            const now = new Date();
            const from = new Date(now);
            from.setDate(from.getDate() - CONFIG.FOOTBALL.DAYS_BEHIND);
            const to = new Date(now);
            to.setDate(to.getDate() + CONFIG.FOOTBALL.DAYS_AHEAD);
            
            const fromStr = from.toISOString().split('T')[0];
            const toStr = to.toISOString().split('T')[0];

            // Build URL with competitions filter
            const comps = CONFIG.FOOTBALL.COMPETITIONS.join(',');
            const url = `${this.apiBase}/matches?competitions=${comps}&dateFrom=${fromStr}&dateTo=${toStr}&status=LIVE,SCHEDULED,FINISHED,PAUSED`;
            
            console.log('[FOOTBALL] Fetching from:', this.apiBase);
            
            const response = await Utils.fetchWithTimeout(url, {
                headers: {
                    'X-Auth-Token': this.apiKey,
                },
            }, 15000, 2);
            
            const data = await response.json();
            const matches = data.matches || [];
            
            console.log('[FOOTBALL] Fetched', matches.length, 'matches');
            
            // Process matches
            const processedMatches = this.processMatches(matches);
            
            // Update state
            StateManager.set('football.matches', processedMatches);
            StateManager.set('football.isLoaded', true);
            StateManager.set('football.lastUpdated', new Date().toISOString());
            StateManager.set('football.isLoading', false);
            
            // Cache matches
            Utils.setToStorage(CONFIG.STORAGE_KEYS.FOOTBALL_MATCHES, processedMatches);
            Utils.setToStorage(CONFIG.STORAGE_KEYS.FOOTBALL_MATCHES_TIMESTAMP, Date.now());
            
            // Trigger event
            Utils.triggerEvent(document.body, 'football:loaded', {
                total: processedMatches.length,
                live: processedMatches.filter(m => m.status === 'LIVE' || m.status === 'IN_PLAY').length,
            });
            
            return processedMatches;
        } catch (error) {
            console.error('[FOOTBALL] Error fetching matches:', error);
            
            StateManager.set('football.error', error.message);
            StateManager.set('football.isLoading', false);
            
            // Try cache fallback
            const cached = Utils.getFromStorage(CONFIG.STORAGE_KEYS.FOOTBALL_MATCHES);
            if (cached && cached.length > 0) {
                StateManager.set('football.matches', cached);
                StateManager.set('football.isLoaded', true);
                console.log('[FOOTBALL] Using', cached.length, 'fallback matches');
                return cached;
            }
            
            // Use generated fallback
            return this.generateFallbackMatches();
        }
    },

    /**
     * Process raw match data
     */
    processMatches(rawMatches) {
        return rawMatches.map(match => ({
            id: match.id,
            utcDate: match.utcDate,
            status: match.status,
            stage: match.stage,
            competition: {
                id: match.competition?.id,
                name: match.competition?.name,
                code: match.competition?.code,
            },
            homeTeam: {
                id: match.homeTeam?.id,
                name: match.homeTeam?.name,
                shortName: match.homeTeam?.shortName,
                crest: match.homeTeam?.crest,
            },
            awayTeam: {
                id: match.awayTeam?.id,
                name: match.awayTeam?.name,
                shortName: match.awayTeam?.shortName,
                crest: match.awayTeam?.crest,
            },
            score: {
                fullTime: match.score?.fullTime || { home: null, away: null },
                halfTime: match.score?.halfTime || { home: null, away: null },
                live: match.score?.winner ? 'FINISHED' : (match.status === 'LIVE' || match.status === 'IN_PLAY') ? 'LIVE' : null,
            },
            winner: match.score?.winner,
            minute: match.minute,
            injuryTime: match.injuryTime,
            referees: match.referees || [],
        }));
    },

    /**
     * Generate fallback match data
     */
    generateFallbackMatches() {
        console.log('[FOOTBALL] Generating fallback match data');
        
        const now = new Date();
        const mockMatches = [];
        
        const mockCompetitions = [
            'Premier League',
            'La Liga',
            'Serie A',
            'Bundesliga',
        ];
        
        const mockTeams = [
            { name: 'Arsenal', shortName: 'ARS' },
            { name: 'Chelsea', shortName: 'CHE' },
            { name: 'Liverpool', shortName: 'LIV' },
            { name: 'Manchester City', shortName: 'MCI' },
            { name: 'Barcelona', shortName: 'BAR' },
            { name: 'Real Madrid', shortName: 'RMA' },
        ];
        
        for (let i = 0; i < 6; i++) {
            const matchDate = new Date(now);
            matchDate.setHours(matchDate.getHours() + (i * 2));
            
            mockMatches.push({
                id: Utils.generateId('match'),
                utcDate: matchDate.toISOString(),
                status: i < 2 ? 'LIVE' : i < 4 ? 'SCHEDULED' : 'FINISHED',
                stage: 'REGULAR_SEASON',
                competition: {
                    name: mockCompetitions[i % mockCompetitions.length],
                },
                homeTeam: mockTeams[i % mockTeams.length],
                awayTeam: mockTeams[(i + 1) % mockTeams.length],
                score: {
                    fullTime: { home: Math.floor(Math.random() * 4), away: Math.floor(Math.random() * 4) },
                    halfTime: { home: Math.floor(Math.random() * 2), away: Math.floor(Math.random() * 2) },
                },
                minute: i < 2 ? Math.floor(Math.random() * 90) : null,
            });
        }
        
        StateManager.set('football.matches', mockMatches);
        StateManager.set('football.isLoaded', true);
        
        return mockMatches;
    },

    /**
     * Find matching channel for a match
     */
    findChannelForMatch(match) {
        const channels = STATE.playlist.channels;
        return Utils.findMatchChannel(match, channels);
    },

    /* ==========================================
       AUTO REFRESH
       ========================================== */

    /**
     * Set up auto-refresh
     */
    setupAutoRefresh() {
        this.updateInterval = setInterval(() => {
            console.log('[FOOTBALL] Auto-refreshing matches...');
            this.fetchMatches(true).catch(error => {
                console.error('[FOOTBALL] Auto-refresh error:', error);
            });
        }, CONFIG.REFRESH_FOOTBALL_MATCHES);
        
        STATE.timers.footballRefresh = this.updateInterval;
        console.log('[FOOTBALL] Auto-refresh set up');
    },

    /* ==========================================
       CLEANUP
       ========================================== */

    /**
     * Destroy Football API
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.abortController) {
            this.abortController.abort();
        }
        
        console.log('[FOOTBALL] Football API destroyed');
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FootballAPI;
}
