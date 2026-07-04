/*=============================================
  ⚽ XBZ Prime TV - Football API Module
  Fetch Live Scores, Matches & Statistics
  =============================================*/

'use strict';

const FootballAPI = {
    /* ==========================================
       FETCH MATCHES
       ========================================== */

    /**
     * Fetch matches from Football Data API
     * @param {boolean} force - Force refresh ignoring cache
     * @returns {Promise<Array>} Array of match objects
     */
    async fetchMatches(force = false) {
        // Check cache first
        if (!force) {
            const cached = Utils.getFromStorage(
                CONFIG.STORAGE_KEYS.FOOTBALL_MATCHES,
                CONFIG.CACHE_FOOTBALL_MATCHES
            );
            if (cached && cached.length > 0) {
                console.log('[FOOTBALL] Using cached matches');
                return cached;
            }
        }

        // Update loading state
        StateManager.set('football.isLoading', true);
        StateManager.set('football.error', null);

        try {
            console.log('[FOOTBALL] Fetching matches from API...');

            // Create abort controller
            const controller = new AbortController();
            STATE.abortControllers.footballFetch = controller;

            // Calculate date range
            const now = new Date();
            const dateFrom = new Date(now);
            dateFrom.setDate(dateFrom.getDate() - CONFIG.FOOTBALL.DAYS_BEHIND);
            
            const dateTo = new Date(now);
            dateTo.setDate(dateTo.getDate() + CONFIG.FOOTBALL.DAYS_AHEAD);

            const dateFromStr = dateFrom.toISOString().split('T')[0];
            const dateToStr = dateTo.toISOString().split('T')[0];

            // Fetch matches for all competitions
            const allMatches = [];
            const competitionPromises = CONFIG.FOOTBALL.COMPETITIONS.map(comp =>
                this.fetchCompetitionMatches(comp, dateFromStr, dateToStr, controller.signal)
            );

            const results = await Promise.allSettled(competitionPromises);

            results.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    allMatches.push(...result.value);
                    console.log(`[FOOTBALL] Competition ${CONFIG.FOOTBALL.COMPETITIONS[index]}: ${result.value.length} matches`);
                } else {
                    const error = result.reason;
                    console.warn(`[FOOTBALL] Competition ${CONFIG.FOOTBALL.COMPETITIONS[index]} failed:`, error?.message);
                }
            });

            if (allMatches.length === 0) {
                throw new Error('No matches fetched from any competition');
            }

            // Process and sort matches
            const processedMatches = this.processMatches(allMatches);
            console.log(`[FOOTBALL] Total matches processed: ${processedMatches.length}`);

            // Cache results
            Utils.setToStorage(CONFIG.STORAGE_KEYS.FOOTBALL_MATCHES, processedMatches);
            Utils.setToStorage(CONFIG.STORAGE_KEYS.FOOTBALL_MATCHES_TIMESTAMP, Date.now());

            // Update state
            StateManager.set('football.matches', processedMatches);
            StateManager.set('football.isLoaded', true);
            StateManager.set('football.lastUpdated', new Date().toISOString());
            StateManager.set('football.isLoading', false);

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
                console.log('[FOOTBALL] Using cached matches as fallback');
                StateManager.set('football.matches', cached);
                StateManager.set('football.isLoaded', true);
                return cached;
            }

            throw error;
        }
    },

    /**
     * Fetch matches for a specific competition
     * @param {string} competition - Competition code
     * @param {string} dateFrom - Start date
     * @param {string} dateTo - End date
     * @param {AbortSignal} signal - Abort signal
     * @returns {Promise<Array>} Array of matches
     */
    async fetchCompetitionMatches(competition, dateFrom, dateTo, signal) {
        try {
            const url = `${CONFIG.FOOTBALL_API_BASE_URL}${CONFIG.FOOTBALL_API_MATCHES_ENDPOINT}`;
            
            const params = new URLSearchParams({
                competitions: competition,
                dateFrom: dateFrom,
                dateTo: dateTo,
                status: CONFIG.FOOTBALL.STATUSES.join(','),
            });

            const response = await fetch(`${url}?${params}`, {
                signal,
                headers: {
                    'X-Auth-Token': CONFIG.FOOTBALL_API_KEY,
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                // Handle rate limiting
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After') || 60;
                    console.warn(`[FOOTBALL] Rate limited for ${competition}, retry after ${retryAfter}s`);
                    
                    if (retryAfter <= 10) {
                        await Utils.sleep(retryAfter * 1000);
                        return this.fetchCompetitionMatches(competition, dateFrom, dateTo, signal);
                    }
                    
                    throw new Error(`Rate limited. Retry after ${retryAfter}s`);
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Check remaining requests
            const remaining = response.headers.get('X-Requests-Available-Minute');
            if (remaining !== null) {
                console.log(`[FOOTBALL] API requests remaining: ${remaining}`);
            }

            return data.matches || [];

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Match fetch aborted');
            }
            throw error;
        }
    },

    /* ==========================================
       MATCH PROCESSING
       ========================================== */

    /**
     * Process raw match data into normalized format
     * @param {Array} matches - Raw match data
     * @returns {Array} Processed matches
     */
    processMatches(matches) {
        return matches
            .map(match => this.normalizeMatch(match))
            .filter(match => match !== null)
            .sort((a, b) => {
                // Live matches first
                if (this.isLiveStatus(a.status) && !this.isLiveStatus(b.status)) return -1;
                if (!this.isLiveStatus(a.status) && this.isLiveStatus(b.status)) return 1;
                
                // Then upcoming
                if (a.status === 'SCHEDULED' && b.status !== 'SCHEDULED') return -1;
                if (a.status !== 'SCHEDULED' && b.status === 'SCHEDULED') return 1;
                
                // Sort by date
                return new Date(a.utcDate) - new Date(b.utcDate);
            });
    },

    /**
     * Normalize a single match object
     * @param {Object} match - Raw match from API
     * @returns {Object|null} Normalized match
     */
    normalizeMatch(match) {
        try {
            if (!match || !match.id) return null;

            const normalized = {
                id: match.id,
                competition: {
                    id: match.competition?.id || '',
                    name: match.competition?.name || 'Unknown Competition',
                    code: match.competition?.code || '',
                    emblem: match.competition?.emblem || '',
                },
                homeTeam: {
                    id: match.homeTeam?.id || '',
                    name: match.homeTeam?.name || 'Unknown Team',
                    shortName: match.homeTeam?.shortName || match.homeTeam?.name || 'TBD',
                    crest: match.homeTeam?.crest || '',
                },
                awayTeam: {
                    id: match.awayTeam?.id || '',
                    name: match.awayTeam?.name || 'Unknown Team',
                    shortName: match.awayTeam?.shortName || match.awayTeam?.name || 'TBD',
                    crest: match.awayTeam?.crest || '',
                },
                score: {
                    fullTime: {
                        home: match.score?.fullTime?.home ?? null,
                        away: match.score?.fullTime?.away ?? null,
                    },
                    halfTime: {
                        home: match.score?.halfTime?.home ?? null,
                        away: match.score?.halfTime?.away ?? null,
                    },
                    winner: match.score?.winner || null,
                },
                status: match.status || 'UNKNOWN',
                minute: match.minute || null,
                injuryTime: match.injuryTime || null,
                utcDate: match.utcDate || '',
                lastUpdated: match.lastUpdated || '',
                venue: match.venue || '',
                referees: match.referees || [],
                stage: match.stage || '',
                group: match.group || '',
                matchday: match.matchday || null,
                odds: match.odds || null,
            };

            // Add computed properties
            normalized.isLive = this.isLiveStatus(normalized.status);
            normalized.isFinished = normalized.status === 'FINISHED';
            normalized.isUpcoming = normalized.status === 'SCHEDULED' || normalized.status === 'TIMED';
            normalized.hasScore = normalized.score.fullTime.home !== null && normalized.score.fullTime.away !== null;
            
            // Format display score
            normalized.displayScore = normalized.hasScore 
                ? `${normalized.score.fullTime.home} - ${normalized.score.fullTime.away}`
                : 'vs';

            // League emoji
            normalized.leagueEmoji = Utils.getLeagueEmoji(normalized.competition.name);

            return normalized;

        } catch (error) {
            console.error('[FOOTBALL] Error normalizing match:', error);
            return null;
        }
    },

    /**
     * Check if status is live
     * @param {string} status - Match status
     * @returns {boolean}
     */
    isLiveStatus(status) {
        return ['LIVE', 'IN_PLAY', 'PAUSED'].includes(status);
    },

    /* ==========================================
       FILTERED GETTERS
       ========================================== */

    /**
     * Get live matches only
     * @returns {Array} Live matches
     */
    getLiveMatches() {
        return STATE.football.matches.filter(match =>
            this.isLiveStatus(match.status)
        );
    },

    /**
     * Get upcoming matches
     * @returns {Array} Upcoming matches
     */
    getUpcomingMatches() {
        return STATE.football.matches.filter(match =>
            match.status === 'SCHEDULED' || match.status === 'TIMED'
        );
    },

    /**
     * Get finished matches
     * @returns {Array} Finished matches
     */
    getFinishedMatches() {
        return STATE.football.matches.filter(match =>
            match.status === 'FINISHED'
        );
    },

    /**
     * Get matches by competition
     * @param {string} competitionCode - Competition code
     * @returns {Array} Filtered matches
     */
    getMatchesByCompetition(competitionCode) {
        return STATE.football.matches.filter(match =>
            match.competition.code === competitionCode
        );
    },

    /**
     * Get match by ID
     * @param {number} matchId - Match ID
     * @returns {Object|null} Match object
     */
    getMatchById(matchId) {
        return STATE.football.matches.find(m => m.id === matchId) || null;
    },

    /* ==========================================
       MATCH TO CHANNEL MAPPING
       ========================================== */

    /**
     * Find best channel for a given match
     * @param {Object} match - Match object
     * @returns {Object|null} Best matching channel
     */
    findChannelForMatch(match) {
        try {
            const channels = STATE.playlist.channels;
            if (!channels.length) return null;

            return Utils.findMatchChannel(match, channels);
        } catch (error) {
            console.error('[FOOTBALL] Error finding channel for match:', error);
            return null;
        }
    },

    /**
     * Get all live matches with channel suggestions
     * @returns {Array} Live matches with channel suggestions
     */
    getLiveMatchesWithChannels() {
        return this.getLiveMatches().map(match => ({
            ...match,
            suggestedChannel: this.findChannelForMatch(match),
        }));
    },

    /* ==========================================
       SCORE TICKER DATA
       ========================================== */

    /**
     * Get formatted live scores for ticker
     * @returns {Array} Score ticker items
     */
    getScoreTickerData() {
        const liveMatches = this.getLiveMatches();
        
        return liveMatches.map(match => ({
            id: match.id,
            homeTeam: match.homeTeam.shortName,
            awayTeam: match.awayTeam.shortName,
            homeScore: match.score.fullTime.home ?? 0,
            awayScore: match.score.fullTime.away ?? 0,
            minute: match.minute || 'LIVE',
            competition: match.competition.name,
            leagueEmoji: match.leagueEmoji,
        }));
    },

    /* ==========================================
       AUTO REFRESH
       ========================================== */

    /**
     * Start auto-refresh for football matches
     */
    startAutoRefresh() {
        this.stopAutoRefresh();
        
        console.log(`[FOOTBALL] Starting auto-refresh every ${CONFIG.REFRESH_FOOTBALL_MATCHES / 1000}s`);
        
        STATE.timers.footballRefresh = setInterval(async () => {
            try {
                console.log('[FOOTBALL] Auto-refreshing matches...');
                await this.fetchMatches(true);
                console.log('[FOOTBALL] Matches auto-refreshed successfully');
            } catch (error) {
                console.error('[FOOTBALL] Auto-refresh failed:', error);
            }
        }, CONFIG.REFRESH_FOOTBALL_MATCHES);
    },

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (STATE.timers.footballRefresh) {
            clearInterval(STATE.timers.footballRefresh);
            STATE.timers.footballRefresh = null;
            console.log('[FOOTBALL] Auto-refresh stopped');
        }
    },

    /* ==========================================
       SCORE TICKER REFRESH
       ========================================== */

    /**
     * Start score ticker refresh interval
     */
    startScoreTickerRefresh() {
        this.stopScoreTickerRefresh();
        
        STATE.timers.scoreTickerInterval = setInterval(() => {
            try {
                const scoreData = this.getScoreTickerData();
                Utils.triggerEvent(document.body, 'scores:updated', { scores: scoreData });
            } catch (error) {
                console.error('[FOOTBALL] Score ticker update error:', error);
            }
        }, CONFIG.REFRESH_SCORE_TICKER);
    },

    /**
     * Stop score ticker refresh
     */
    stopScoreTickerRefresh() {
        if (STATE.timers.scoreTickerInterval) {
            clearInterval(STATE.timers.scoreTickerInterval);
            STATE.timers.scoreTickerInterval = null;
        }
    },

    /* ==========================================
       STATISTICS
       ========================================== */

    /**
     * Get match statistics summary
     * @returns {Object} Stats summary
     */
    getStats() {
        const matches = STATE.football.matches;
        
        return {
            total: matches.length,
            live: this.getLiveMatches().length,
            upcoming: this.getUpcomingMatches().length,
            finished: this.getFinishedMatches().length,
            competitions: [...new Set(matches.map(m => m.competition.name))].length,
            lastUpdated: STATE.football.lastUpdated,
            matchesWithScores: matches.filter(m => m.hasScore).length,
            goalsScored: matches.reduce((sum, m) => {
                return sum + (m.score.fullTime.home || 0) + (m.score.fullTime.away || 0);
            }, 0),
        };
    },

    /* ==========================================
       OFFLINE FALLBACK
       ========================================== */

    /**
     * Generate mock/fallback match data for offline mode
     * @returns {Array} Mock match data
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
            { name: 'Arsenal', shortName: 'ARS', crest: '' },
            { name: 'Chelsea', shortName: 'CHE', crest: '' },
            { name: 'Liverpool', shortName: 'LIV', crest: '' },
            { name: 'Manchester City', shortName: 'MCI', crest: '' },
            { name: 'Barcelona', shortName: 'BAR', crest: '' },
            { name: 'Real Madrid', shortName: 'RMA', crest: '' },
            { name: 'AC Milan', shortName: 'MIL', crest: '' },
            { name: 'Bayern Munich', shortName: 'BAY', crest: '' },
        ];
        
        // Generate some live matches
        for (let i = 0; i < 3; i++) {
            const home = Utils.getRandomItem(mockTeams);
            let away = Utils.getRandomItem(mockTeams);
            while (away.name === home.name) {
                away = Utils.getRandomItem(mockTeams);
            }
            
            mockMatches.push({
                id: 1000 + i,
                competition: {
                    id: i,
                    name: Utils.getRandomItem(mockCompetitions),
                    code: 'MOCK',
                    emblem: '',
                },
                homeTeam: { ...home },
                awayTeam: { ...away },
                score: {
                    fullTime: {
                        home: Math.floor(Math.random() * 4),
                        away: Math.floor(Math.random() * 4),
                    },
                    halfTime: { home: 0, away: 0 },
                    winner: null,
                },
                status: 'LIVE',
                minute: Math.floor(Math.random() * 90) + 1,
                injuryTime: null,
                utcDate: now.toISOString(),
                lastUpdated: now.toISOString(),
                venue: '',
                referees: [],
                stage: 'REGULAR_SEASON',
                group: null,
                matchday: 1,
                isLive: true,
                isFinished: false,
                isUpcoming: false,
                hasScore: true,
                displayScore: '0 - 0',
                leagueEmoji: '⚽',
            });
        }
        
        return mockMatches;
    },

    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize Football API module
     */
    async init() {
        console.log('[FOOTBALL] Initializing Football API module...');
        
        try {
            // Fetch initial matches
            const matches = await this.fetchMatches();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            // Start score ticker refresh
            this.startScoreTickerRefresh();
            
            console.log(`[FOOTBALL] Initialized with ${matches.length} matches`);
            return matches;
            
        } catch (error) {
            console.error('[FOOTBALL] Initialization error:', error);
            
            // Try loading from cache
            const cached = Utils.getFromStorage(CONFIG.STORAGE_KEYS.FOOTBALL_MATCHES);
            if (cached && cached.length > 0) {
                StateManager.set('football.matches', cached);
                StateManager.set('football.isLoaded', true);
                console.log(`[FOOTBALL] Loaded ${cached.length} matches from cache`);
                return cached;
            }
            
            // Use fallback data
            const fallback = this.generateFallbackMatches();
            StateManager.set('football.matches', fallback);
            StateManager.set('football.isLoaded', true);
            console.log(`[FOOTBALL] Using ${fallback.length} fallback matches`);
            return fallback;
        }
    },

    /**
     * Cleanup
     */
    destroy() {
        this.stopAutoRefresh();
        this.stopScoreTickerRefresh();
        if (STATE.abortControllers.footballFetch) {
            STATE.abortControllers.footballFetch.abort();
        }
        console.log('[FOOTBALL] Football API module destroyed');
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FootballAPI;
}
