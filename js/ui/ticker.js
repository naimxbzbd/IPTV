/*=============================================
  ⚽ XBZ Prime TV - Ticker Component
  Breaking News & Live Score Tickers
  =============================================*/

'use strict';

const TickerComponent = {
    /* ==========================================
       DOM ELEMENTS
       ========================================== */

    elements: {
        breakingNews: null,
        tickerContent: null,
        scoreTicker: null,
        scoreTickerContent: null,
    },

    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize ticker component
     */
    init() {
        console.log('[TICKER] Initializing ticker component...');

        try {
            // Cache DOM elements
            this.cacheElements();

            // Set up event listeners
            this.setupEventListeners();

            // Initialize tickers with current data
            this.updateBreakingNewsTicker();
            this.updateScoreTicker();

            // Start score ticker refresh
            this.startScoreTickerRefresh();

            console.log('[TICKER] Ticker component initialized');
        } catch (error) {
            console.error('[TICKER] Initialization error:', error);
        }
    },

    /**
     * Cache ticker DOM elements
     */
    cacheElements() {
        this.elements.breakingNews = Utils.$('#breaking-news');
        this.elements.tickerContent = Utils.$('#ticker-content');
        this.elements.scoreTicker = Utils.$('#score-ticker');
        this.elements.scoreTickerContent = Utils.$('#score-ticker-content');
    },

    /* ==========================================
       EVENT LISTENERS
       ========================================== */

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for breaking news updates
        document.body.addEventListener('breakingnews:loaded', () => {
            this.updateBreakingNewsTicker();
        });

        // Listen for score updates
        document.body.addEventListener('scores:updated', (event) => {
            const scores = event.detail?.scores;
            if (scores) {
                this.updateScoreTickerContent(scores);
            }
        });

        // Listen for match updates
        document.body.addEventListener('football:loaded', () => {
            this.updateScoreTicker();
        });

        // Pause marquee on hover
        if (this.elements.tickerContent) {
            this.elements.tickerContent.addEventListener('mouseenter', () => {
                this.pauseMarquee(this.elements.tickerContent);
            });

            this.elements.tickerContent.addEventListener('mouseleave', () => {
                this.resumeMarquee(this.elements.tickerContent);
            });

            // Touch events for mobile
            this.elements.tickerContent.addEventListener('touchstart', () => {
                this.pauseMarquee(this.elements.tickerContent);
            }, { passive: true });

            this.elements.tickerContent.addEventListener('touchend', () => {
                setTimeout(() => {
                    this.resumeMarquee(this.elements.tickerContent);
                }, 2000);
            });
        }

        // Pause score ticker on hover
        if (this.elements.scoreTickerContent) {
            this.elements.scoreTickerContent.addEventListener('mouseenter', () => {
                this.pauseMarquee(this.elements.scoreTickerContent);
            });

            this.elements.scoreTickerContent.addEventListener('mouseleave', () => {
                this.resumeMarquee(this.elements.scoreTickerContent);
            });

            // Touch events for mobile
            this.elements.scoreTickerContent.addEventListener('touchstart', () => {
                this.pauseMarquee(this.elements.scoreTickerContent);
            }, { passive: true });

            this.elements.scoreTickerContent.addEventListener('touchend', () => {
                setTimeout(() => {
                    this.resumeMarquee(this.elements.scoreTickerContent);
                }, 2000);
            });
        }
    },

    /* ==========================================
       BREAKING NEWS TICKER
       ========================================== */

    /**
     * Update breaking news ticker with latest data
     */
    updateBreakingNewsTicker() {
        if (!this.elements.tickerContent) return;

        try {
            const items = STATE.breakingNews.items;

            if (items.length === 0) {
                this.elements.tickerContent.innerHTML = `
                    <span class="ticker-item">
                        <i class="fas fa-newspaper"></i> 
                        Welcome to XBZ Prime TV - Premium Sports Live Streaming ⚽
                    </span>
                `;
                return;
            }

            // Generate ticker HTML with duplicated items for seamless marquee
            const tickerItems = this.generateBreakingNewsHTML(items);
            this.elements.tickerContent.innerHTML = tickerItems;

            // Reset animation
            this.resetMarqueeAnimation(this.elements.tickerContent);

            console.log(`[TICKER] Breaking news updated: ${items.length} items`);
        } catch (error) {
            console.error('[TICKER] Error updating breaking news:', error);
        }
    },

    /**
     * Generate HTML for breaking news ticker
     * @param {Array} items - News items
     * @returns {string} HTML string
     */
    generateBreakingNewsHTML(items) {
        // Create ticker items
        const singleSet = items.map((item, index) => {
            const liveBadge = item.isLive 
                ? '<span class="live-dot" style="margin-right:4px;"></span>' 
                : '';
            
            const content = item.url 
                ? `<a href="${Utils.escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" 
                     style="color: var(--color-text-link); text-decoration: none;">
                     ${Utils.escapeHTML(item.title)}
                   </a>`
                : Utils.escapeHTML(item.title);

            const priorityClass = item.priority === 'high' || item.priority === 'breaking' 
                ? 'ticker-item-highlight' 
                : '';

            return `
                <span class="ticker-item ${priorityClass}">
                    ${liveBadge}${content}
                </span>
                <span class="ticker-separator">•</span>
            `;
        }).join('');

        // Duplicate for seamless marquee
        const duplicatedCount = CONFIG.UI.MARQUEE_DUPLICATE_COUNT;
        let allItems = '';
        for (let i = 0; i < duplicatedCount; i++) {
            allItems += singleSet;
        }

        return allItems;
    },

    /* ==========================================
       LIVE SCORE TICKER
       ========================================== */

    /**
     * Update live score ticker
     */
    updateScoreTicker() {
        if (!this.elements.scoreTickerContent) return;

        try {
            const liveMatches = STATE.football.liveMatches;

            if (liveMatches.length === 0) {
                // Check for upcoming matches
                const upcomingMatches = STATE.football.upcomingMatches.slice(0, 5);
                
                if (upcomingMatches.length > 0) {
                    const upcomingHTML = this.generateUpcomingMatchesHTML(upcomingMatches);
                    this.elements.scoreTickerContent.innerHTML = upcomingHTML;
                } else {
                    this.elements.scoreTickerContent.innerHTML = `
                        <span class="score-item">
                            <i class="fas fa-futbol"></i>
                            No live matches at the moment
                        </span>
                    `;
                }
                return;
            }

            // Generate live scores HTML
            const scoresHTML = this.generateLiveScoresHTML(liveMatches);
            this.elements.scoreTickerContent.innerHTML = scoresHTML;

            // Reset animation
            this.resetMarqueeAnimation(this.elements.scoreTickerContent);

            console.log(`[TICKER] Score ticker updated: ${liveMatches.length} live matches`);
        } catch (error) {
            console.error('[TICKER] Error updating score ticker:', error);
        }
    },

    /**
     * Update score ticker content with provided scores
     * @param {Array} scores - Score data
     */
    updateScoreTickerContent(scores) {
        if (!this.elements.scoreTickerContent) return;

        try {
            if (!scores || scores.length === 0) {
                this.elements.scoreTickerContent.innerHTML = `
                    <span class="score-item">No live scores available</span>
                `;
                return;
            }

            const html = this.generateLiveScoresHTML(scores);
            this.elements.scoreTickerContent.innerHTML = html;
            this.resetMarqueeAnimation(this.elements.scoreTickerContent);
        } catch (error) {
            console.error('[TICKER] Error updating score ticker content:', error);
        }
    },

    /**
     * Generate HTML for live scores
     * @param {Array} matches - Live match data
     * @returns {string} HTML string
     */
    generateLiveScoresHTML(matches) {
        const singleSet = matches.map(match => {
            const homeScore = match.score?.fullTime?.home ?? match.homeScore ?? 0;
            const awayScore = match.score?.fullTime?.away ?? match.awayScore ?? 0;
            const minute = match.minute || 'LIVE';
            const homeTeam = match.homeTeam?.shortName || match.homeTeam || 'HOME';
            const awayTeam = match.awayTeam?.shortName || match.awayTeam || 'AWAY';
            const leagueEmoji = match.leagueEmoji || '⚽';

            return `
                <span class="score-item">
                    <span class="score-league-emoji">${leagueEmoji}</span>
                    <span class="score-team home">${Utils.escapeHTML(homeTeam)}</span>
                    <span class="score-result">${homeScore} - ${awayScore}</span>
                    <span class="score-team away">${Utils.escapeHTML(awayTeam)}</span>
                    <span class="score-minute">${minute}'</span>
                </span>
                <span class="ticker-separator">|</span>
            `;
        }).join('');

        // Duplicate for seamless marquee
        let allItems = '';
        for (let i = 0; i < CONFIG.UI.MARQUEE_DUPLICATE_COUNT; i++) {
            allItems += singleSet;
        }

        return allItems;
    },

    /**
     * Generate HTML for upcoming matches
     * @param {Array} matches - Upcoming match data
     * @returns {string} HTML string
     */
    generateUpcomingMatchesHTML(matches) {
        const singleSet = matches.map(match => {
            const homeTeam = match.homeTeam?.shortName || match.homeTeam || 'TBD';
            const awayTeam = match.awayTeam?.shortName || match.awayTeam || 'TBD';
            const time = Utils.formatMatchTime(match.utcDate);
            const leagueEmoji = match.leagueEmoji || '⚽';

            return `
                <span class="score-item upcoming">
                    <span class="score-league-emoji">${leagueEmoji}</span>
                    <span class="score-team home">${Utils.escapeHTML(homeTeam)}</span>
                    <span class="score-result">vs</span>
                    <span class="score-team away">${Utils.escapeHTML(awayTeam)}</span>
                    <span class="score-minute upcoming-time">${time}</span>
                </span>
                <span class="ticker-separator">|</span>
            `;
        }).join('');

        // Duplicate for seamless marquee
        let allItems = '';
        for (let i = 0; i < CONFIG.UI.MARQUEE_DUPLICATE_COUNT; i++) {
            allItems += singleSet;
        }

        return allItems;
    },

    /* ==========================================
       MARQUEE CONTROLS
       ========================================== */

    /**
     * Pause marquee animation
     * @param {Element} element - Marquee element
     */
    pauseMarquee(element) {
        if (element) {
            element.style.animationPlayState = 'paused';
        }
    },

    /**
     * Resume marquee animation
     * @param {Element} element - Marquee element
     */
    resumeMarquee(element) {
        if (element) {
            element.style.animationPlayState = 'running';
        }
    },

    /**
     * Reset marquee animation
     * @param {Element} element - Marquee element
     */
    resetMarqueeAnimation(element) {
        if (!element) return;

        // Remove and re-add animation to reset
        element.style.animation = 'none';
        element.offsetHeight; // Trigger reflow
        element.style.animation = '';

        // Ensure it's running
        element.style.animationPlayState = 'running';
    },

    /* ==========================================
       SCORE TICKER REFRESH
       ========================================== */

    /**
     * Start score ticker auto-refresh
     */
    startScoreTickerRefresh() {
        // Clear existing interval
        this.stopScoreTickerRefresh();

        // Set up interval for score ticker updates
        STATE.timers.scoreTickerInterval = setInterval(() => {
            try {
                const liveMatches = STATE.football.liveMatches;
                
                // Only update if we have live matches
                if (liveMatches.length > 0) {
                    this.updateScoreTickerContent(liveMatches);
                }
            } catch (error) {
                console.error('[TICKER] Score ticker refresh error:', error);
            }
        }, CONFIG.REFRESH_SCORE_TICKER);

        console.log(`[TICKER] Score ticker refresh started (every ${CONFIG.REFRESH_SCORE_TICKER / 1000}s)`);
    },

    /**
     * Stop score ticker auto-refresh
     */
    stopScoreTickerRefresh() {
        if (STATE.timers.scoreTickerInterval) {
            clearInterval(STATE.timers.scoreTickerInterval);
            STATE.timers.scoreTickerInterval = null;
        }
    },

    /* ==========================================
       TICKER VISIBILITY
       ========================================== */

    /**
     * Show breaking news ticker
     */
    showBreakingNews() {
        if (this.elements.breakingNews) {
            this.elements.breakingNews.style.display = '';
        }
    },

    /**
     * Hide breaking news ticker
     */
    hideBreakingNews() {
        if (this.elements.breakingNews) {
            this.elements.breakingNews.style.display = 'none';
        }
    },

    /**
     * Show score ticker
     */
    showScoreTicker() {
        if (this.elements.scoreTicker) {
            this.elements.scoreTicker.style.display = '';
        }
    },

    /**
     * Hide score ticker
     */
    hideScoreTicker() {
        if (this.elements.scoreTicker) {
            this.elements.scoreTicker.style.display = 'none';
        }
    },

    /* ==========================================
       MANUAL REFRESH
       ========================================== */

    /**
     * Manually refresh both tickers
     */
    refreshAll() {
        this.updateBreakingNewsTicker();
        this.updateScoreTicker();
        console.log('[TICKER] All tickers manually refreshed');
    },

    /* ==========================================
       TICKER STATUS
       ========================================== */

    /**
     * Get ticker status
     * @returns {Object} Ticker status
     */
    getStatus() {
        return {
            breakingNewsCount: STATE.breakingNews.items.length,
            breakingNewsActive: STATE.breakingNews.isLoaded,
            liveMatchCount: STATE.football.liveMatches.length,
            scoreTickerActive: STATE.football.isLoaded,
            isRefreshing: !!STATE.timers.scoreTickerInterval,
        };
    },

    /* ==========================================
       CLEANUP
       ========================================== */

    /**
     * Clean up ticker component
     */
    destroy() {
        this.stopScoreTickerRefresh();
        console.log('[TICKER] Ticker component destroyed');
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TickerComponent;
}
