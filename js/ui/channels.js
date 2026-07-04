/*=============================================
  ⚽ XBZ Prime TV - Channels Component
  Channel Grid, Cards & Category Filtering
  =============================================*/

'use strict';

const ChannelsComponent = {
    /* ==========================================
       DOM ELEMENTS
       ========================================== */

    elements: {
        section: null,
        grid: null,
        emptyState: null,
        filterSelect: null,
        filteredCount: null,
        reloadBtn: null,
    },

    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize channels component
     */
    init() {
        console.log('[CHANNELS] Initializing channels component...');

        try {
            // Cache DOM elements
            this.cacheElements();

            // Set up event listeners
            this.setupEventListeners();

            // Populate category filter
            this.populateCategoryFilter();

            // Initial render
            this.renderChannels();

            console.log('[CHANNELS] Channels component initialized');
        } catch (error) {
            console.error('[CHANNELS] Initialization error:', error);
        }
    },

    /**
     * Cache channels DOM elements
     */
    cacheElements() {
        this.elements.section = Utils.$('#channels-section');
        this.elements.grid = Utils.$('#channels-grid');
        this.elements.emptyState = Utils.$('#channels-empty');
        this.elements.filterSelect = Utils.$('#category-filter');
        this.elements.filteredCount = Utils.$('#filtered-count');
        this.elements.reloadBtn = Utils.$('#channels-reload');
    },

    /* ==========================================
       EVENT LISTENERS
       ========================================== */

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Category filter change
        if (this.elements.filterSelect) {
            this.elements.filterSelect.addEventListener('change', (event) => {
                const category = event.target.value;
                this.filterByCategory(category);
            });
        }

        // Reload button
        if (this.elements.reloadBtn) {
            this.elements.reloadBtn.addEventListener('click', () => {
                this.reloadChannels();
            });
        }

        // Delegate click events on channel grid
        if (this.elements.grid) {
            this.elements.grid.addEventListener('click', (event) => {
                // Play button click
                const playBtn = event.target.closest('.channel-play-btn');
                if (playBtn) {
                    const channelId = playBtn.dataset.channelId;
                    if (channelId) {
                        this.playChannelById(channelId);
                    }
                    return;
                }

                // Card click (anywhere on card plays channel)
                const card = event.target.closest('.channel-card');
                if (card) {
                    const channelId = card.dataset.channelId;
                    if (channelId) {
                        this.playChannelById(channelId);
                    }
                }
            });
        }

        // Listen for playlist updates
        document.body.addEventListener('playlist:loaded', () => {
            this.populateCategoryFilter();
            this.renderChannels();
        });

        // Listen for filter/search state changes
        document.body.addEventListener('statechange', (event) => {
            const path = event.detail?.path;
            if (path === 'playlist.filteredChannels' || 
                path === 'playlist.selectedCategory' ||
                path === 'playlist.searchQuery') {
                this.renderChannels();
                this.updateFilteredCount();
            }
        });

        // Listen for sidebar category selection
        document.body.addEventListener('statechange', (event) => {
            if (event.detail?.path === 'playlist.selectedCategory') {
                this.syncFilterWithSidebar(event.detail.newValue);
            }
        });
    },

    /* ==========================================
       CHANNEL RENDERING
       ========================================== */

    /**
     * Render channel grid
     */
    renderChannels() {
        if (!this.elements.grid) return;

        try {
            const channels = STATE.playlist.filteredChannels;

            // Clear grid
            Utils.emptyElement(this.elements.grid);

            // Update filtered count
            this.updateFilteredCount();

            if (channels.length === 0) {
                this.showEmptyState();
                return;
            }

            // Hide empty state
            this.hideEmptyState();

            // Render channel cards
            const fragment = document.createDocumentFragment();
            
            channels.forEach((channel, index) => {
                const card = this.createChannelCard(channel, index);
                fragment.appendChild(card);
            });

            this.elements.grid.appendChild(fragment);

            console.log(`[CHANNELS] Rendered ${channels.length} channels`);
        } catch (error) {
            console.error('[CHANNELS] Error rendering channels:', error);
        }
    },

    /**
     * Create a channel card element
     * @param {Object} channel - Channel data
     * @param {number} index - Channel index
     * @returns {Element} Channel card element
     */
    createChannelCard(channel, index) {
        const card = Utils.createElement('div', {
            className: 'channel-card reveal',
            dataset: { 
                channelId: channel.id,
                channelIndex: index,
            },
            title: `${channel.name} - ${channel.category} (${channel.quality || 'HD'})`,
        });

        // Add stagger delay
        card.style.animationDelay = `${index * 30}ms`;

        // Card Header
        const header = Utils.createElement('div', {
            className: 'channel-card-header',
        });

        // Channel Logo
        const logo = Utils.createElement('div', {
            className: 'channel-logo',
        });

        if (channel.logo && Utils.isValidURL(channel.logo)) {
            const logoImg = Utils.createElement('img', {
                src: channel.logo,
                alt: channel.name,
                loading: 'lazy',
                onerror: function() {
                    this.style.display = 'none';
                    this.nextElementSibling.style.display = 'flex';
                },
            });
            logo.appendChild(logoImg);
            
            const logoFallback = Utils.createElement('div', {
                className: 'logo-fallback',
                style: { display: 'none' },
                text: (channel.name || 'TV').substring(0, 3).toUpperCase(),
            });
            logo.appendChild(logoFallback);
        } else {
            const logoFallback = Utils.createElement('div', {
                className: 'logo-fallback',
                text: (channel.name || 'TV').substring(0, 3).toUpperCase(),
            });
            logo.appendChild(logoFallback);
        }

        // Status dot
        const statusDot = Utils.createElement('span', {
            className: `status-dot ${channel.isLive ? 'online' : 'offline'}`,
            title: channel.isLive ? 'Live' : 'Available',
        });
        logo.appendChild(statusDot);

        // Channel Info
        const info = Utils.createElement('div', {
            className: 'channel-info',
        });

        const name = Utils.createElement('div', {
            className: 'channel-name',
            text: channel.name || 'Unknown Channel',
        });

        const category = Utils.createElement('div', {
            className: 'channel-category',
        });
        const categoryEmoji = Utils.getCategoryEmoji(channel.category);
        category.innerHTML = `${categoryEmoji} ${Utils.escapeHTML(channel.category || 'General')}`;

        info.appendChild(name);
        info.appendChild(category);

        header.appendChild(logo);
        header.appendChild(info);

        // Card Footer
        const footer = Utils.createElement('div', {
            className: 'channel-card-footer',
        });

        // Quality badges
        const qualityBadges = Utils.createElement('div', {
            className: 'channel-quality-badges',
        });

        // Main quality badge
        const quality = (channel.quality || 'HD').toUpperCase();
        if (quality === '4K') {
            qualityBadges.innerHTML = '<span class="badge badge-4k">4K</span>';
        } else if (quality === 'HD' || quality === 'FHD') {
            qualityBadges.innerHTML = '<span class="badge badge-hd">HD</span>';
        } else {
            qualityBadges.innerHTML = `<span class="badge badge-sd">${Utils.escapeHTML(quality)}</span>`;
        }

        // Live badge if applicable
        if (channel.isLive) {
            const liveBadge = Utils.createElement('span', {
                className: 'badge badge-live',
                text: 'LIVE',
            });
            qualityBadges.appendChild(liveBadge);
        }

        // Play button
        const playBtn = Utils.createElement('button', {
            className: 'channel-play-btn',
            dataset: { channelId: channel.id },
            title: `Play ${channel.name}`,
            'aria-label': `Play ${channel.name}`,
        });
        playBtn.innerHTML = '<i class="fas fa-play"></i>';

        footer.appendChild(qualityBadges);
        footer.appendChild(playBtn);

        // Assemble card
        card.appendChild(header);
        card.appendChild(footer);

        return card;
    },

    /* ==========================================
       CHANNEL ACTIONS
       ========================================== */

    /**
     * Play a channel by its ID
     * @param {string} channelId - Channel ID
     */
    playChannelById(channelId) {
        try {
            const channel = GitHubAPI.getChannelById(channelId);
            if (!channel) {
                ToastManager.error('Channel not found', 'Error');
                return;
            }

            console.log(`[CHANNELS] Playing channel: ${channel.name}`);

            // Play the channel
            PlayerModule.playChannel(channel);

            // Scroll to player on mobile
            if (Utils.isMobile()) {
                const playerSection = Utils.$('#player-section');
                if (playerSection) {
                    playerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }

            // Highlight active channel card
            this.highlightActiveChannel(channelId);

            ToastManager.showStreamStarted(channel.name);
        } catch (error) {
            console.error('[CHANNELS] Error playing channel:', error);
            ToastManager.error('Failed to play channel', 'Error');
        }
    },

    /**
     * Highlight the active channel card
     * @param {string} channelId - Active channel ID
     */
    highlightActiveChannel(channelId) {
        // Remove previous active
        const prevActive = Utils.$('.channel-card.active');
        if (prevActive) {
            prevActive.classList.remove('active');
        }

        // Add active to current
        const currentCard = Utils.$(`.channel-card[data-channel-id="${channelId}"]`);
        if (currentCard) {
            currentCard.classList.add('active');
        }
    },

    /* ==========================================
       CATEGORY FILTER
       ========================================== */

    /**
     * Populate category filter dropdown
     */
    populateCategoryFilter() {
        if (!this.elements.filterSelect) return;

        try {
            const categories = STATE.playlist.categories;
            
            // Clear existing options except "All"
            while (this.elements.filterSelect.options.length > 1) {
                this.elements.filterSelect.remove(1);
            }

            // Add category options
            categories.forEach(category => {
                const option = Utils.createElement('option', {
                    value: category.toLowerCase(),
                    text: `${category} (${Utils.formatNumber(
                        STATE.playlist.channels.filter(
                            ch => ch.category.toLowerCase() === category.toLowerCase()
                        ).length
                    )})`,
                });
                this.elements.filterSelect.appendChild(option);
            });

            // Set current value
            this.elements.filterSelect.value = STATE.playlist.selectedCategory;

            console.log(`[CHANNELS] Filter populated with ${categories.length} categories`);
        } catch (error) {
            console.error('[CHANNELS] Error populating filter:', error);
        }
    },

    /**
     * Filter channels by category
     * @param {string} category - Category to filter
     */
    filterByCategory(category) {
        console.log(`[CHANNELS] Filtering by category: ${category}`);
        StateManager.set('playlist.selectedCategory', category);
    },

    /**
     * Sync filter dropdown with sidebar selection
     * @param {string} category - Selected category
     */
    syncFilterWithSidebar(category) {
        if (this.elements.filterSelect && this.elements.filterSelect.value !== category) {
            this.elements.filterSelect.value = category;
        }
    },

    /**
     * Update filtered count display
     */
    updateFilteredCount() {
        if (!this.elements.filteredCount) return;

        const filtered = STATE.playlist.filteredCount;
        const total = STATE.playlist.totalCount;

        if (STATE.playlist.selectedCategory === 'all' && !STATE.playlist.searchQuery) {
            this.elements.filteredCount.textContent = `${Utils.formatNumber(total)} channels`;
        } else {
            this.elements.filteredCount.textContent = `${Utils.formatNumber(filtered)} / ${Utils.formatNumber(total)} channels`;
        }
    },

    /* ==========================================
       EMPTY STATE
       ========================================== */

    /**
     * Show empty state
     */
    showEmptyState() {
        if (!this.elements.emptyState) return;

        this.elements.emptyState.classList.remove('hidden');

        const message = Utils.$('p', this.elements.emptyState);
        if (message) {
            if (STATE.playlist.searchQuery) {
                message.textContent = `No channels found for "${STATE.playlist.searchQuery}"`;
            } else if (STATE.playlist.selectedCategory !== 'all') {
                message.textContent = `No channels in ${Utils.capitalize(STATE.playlist.selectedCategory)}`;
            } else {
                message.textContent = 'No channels available';
            }
        }
    },

    /**
     * Hide empty state
     */
    hideEmptyState() {
        if (this.elements.emptyState) {
            this.elements.emptyState.classList.add('hidden');
        }
    },

    /* ==========================================
       RELOAD
       ========================================== */

    /**
     * Reload channels from source
     */
    async reloadChannels() {
        try {
            console.log('[CHANNELS] Manual channel reload triggered');

            // Disable reload button
            if (this.elements.reloadBtn) {
                this.elements.reloadBtn.disabled = true;
                const icon = Utils.$('i', this.elements.reloadBtn);
                if (icon) icon.classList.add('fa-spin');
            }

            // Fetch fresh playlist
            await GitHubAPI.fetchPlaylist(true);

            // Re-enable button
            if (this.elements.reloadBtn) {
                this.elements.reloadBtn.disabled = false;
                const icon = Utils.$('i', this.elements.reloadBtn);
                if (icon) icon.classList.remove('fa-spin');
            }

            ToastManager.success('Channels reloaded successfully', 'Reloaded');

        } catch (error) {
            console.error('[CHANNELS] Reload error:', error);

            if (this.elements.reloadBtn) {
                this.elements.reloadBtn.disabled = false;
                const icon = Utils.$('i', this.elements.reloadBtn);
                if (icon) icon.classList.remove('fa-spin');
            }

            ToastManager.error('Failed to reload channels', 'Error');
        }
    },

    /* ==========================================
       INTERSECTION OBSERVER
       ========================================== */

    /**
     * Set up intersection observer for lazy loading and reveal animations
     */
    setupIntersectionObserver() {
        try {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                            
                            // Lazy load logo images
                            const logoImg = Utils.$('.channel-logo img[data-src]', entry.target);
                            if (logoImg && logoImg.dataset.src) {
                                logoImg.src = logoImg.dataset.src;
                                logoImg.removeAttribute('data-src');
                            }

                            observer.unobserve(entry.target);
                        }
                    });
                },
                { 
                    threshold: CONFIG.UI.INTERSECTION_THRESHOLD,
                    rootMargin: '50px',
                }
            );

            // Store for later use
            STATE.dom.observers.channelReveal = observer;

            console.log('[CHANNELS] Intersection observer set up');
        } catch (error) {
            console.error('[CHANNELS] Error setting up intersection observer:', error);
        }
    },

    /**
     * Observe channel cards for reveal
     */
    observeChannelCards() {
        if (!STATE.dom.observers.channelReveal) return;

        const cards = Utils.$$('.channel-card.reveal:not(.visible)');
        cards.forEach(card => {
            STATE.dom.observers.channelReveal.observe(card);
        });
    },

    /* ==========================================
       QUICK ACTIONS
       ========================================== */

    /**
     * Play a random channel
     */
    playRandomChannel() {
        const channels = STATE.playlist.filteredChannels;
        if (channels.length === 0) {
            ToastManager.warning('No channels available', 'Random Play');
            return;
        }

        const randomChannel = Utils.getRandomItem(channels);
        this.playChannelById(randomChannel.id);
    },

    /**
     * Play first available live channel
     */
    playFirstLiveChannel() {
        const liveChannels = STATE.playlist.channels.filter(ch => ch.isLive);
        
        if (liveChannels.length === 0) {
            // Fallback to first channel
            if (STATE.playlist.channels.length > 0) {
                this.playChannelById(STATE.playlist.channels[0].id);
                ToastManager.info('No live channels found, playing first available channel', 'Auto Play');
            } else {
                ToastManager.warning('No channels available', 'Auto Play');
            }
            return;
        }

        this.playChannelById(liveChannels[0].id);
    },

    /* ==========================================
       CHANNEL STATS
       ========================================== */

    /**
     * Get channel statistics
     * @returns {Object} Channel stats
     */
    getStats() {
        return GitHubAPI.getStats();
    },

    /* ==========================================
       CLEANUP
       ========================================== */

    /**
     * Clean up channels component
     */
    destroy() {
        // Disconnect observers
        if (STATE.dom.observers.channelReveal) {
            STATE.dom.observers.channelReveal.disconnect();
        }

        console.log('[CHANNELS] Channels component destroyed');
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChannelsComponent;
}
