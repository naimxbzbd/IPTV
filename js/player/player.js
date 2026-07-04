/*=============================================
  ⚽ XBZ Prime TV - Video Player Module
  Video.js + HLS.js Integration
  =============================================*/

'use strict';

const PlayerModule = {
    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize the video player
     * @returns {Promise} Resolves when player is ready
     */
    async init() {
        console.log('[PLAYER] Initializing video player...');

        try {
            const videoElement = Utils.$('#main-player');
            if (!videoElement) {
                throw new Error('Video element not found');
            }

            // Store reference
            STATE.player.videoElement = videoElement;

            // Initialize Video.js
            await this.initVideoJS(videoElement);

            // Set up event listeners
            this.setupPlayerEvents();
            this.setupKeyboardControls();
            this.setupVisibilityHandling();

            // Restore previous volume/mute state
            this.restorePlayerState();

            console.log('[PLAYER] Video player initialized successfully');
            return STATE.player.videoJS;

        } catch (error) {
            console.error('[PLAYER] Player initialization error:', error);
            this.showError('Failed to initialize player');
            throw error;
        }
    },

    /**
     * Initialize Video.js player
     * @param {Element} videoElement - Video element
     */
    initVideoJS(videoElement) {
        return new Promise((resolve, reject) => {
            try {
                const options = {
                    controls: CONFIG.PLAYER.CONTROLS,
                    autoplay: CONFIG.PLAYER.AUTOPLAY,
                    muted: CONFIG.PLAYER.MUTED,
                    preload: CONFIG.PLAYER.PRELOAD,
                    playsinline: CONFIG.PLAYER.PLAYSINLINE,
                    loop: CONFIG.PLAYER.LOOP,
                    fluid: CONFIG.PLAYER.FLUID,
                    aspectRatio: CONFIG.PLAYER.ASPECT_RATIO,
                    liveui: CONFIG.PLAYER.LIVEUI,
                    language: 'en',
                    playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
                    controlBar: {
                        children: [
                            'playToggle',
                            'volumePanel',
                            'currentTimeDisplay',
                            'timeDivider',
                            'durationDisplay',
                            'progressControl',
                            'liveDisplay',
                            'remainingTimeDisplay',
                            'customControlSpacer',
                            'playbackRateMenuButton',
                            'chaptersButton',
                            'descriptionsButton',
                            'subsCapsButton',
                            'audioTrackButton',
                            'pictureInPictureToggle',
                            'fullscreenToggle',
                        ],
                    },
                    userActions: {
                        hotkeys: true,
                    },
                    html5: {
                        nativeTextTracks: false,
                        hls: {
                            overrideNative: true,
                        },
                        vhs: {
                            overrideNative: true,
                        },
                    },
                };

                const player = videojs(videoElement, options, function onPlayerReady() {
                    console.log('[PLAYER] Video.js player ready');
                    
                    // Store reference
                    STATE.player.videoJS = player;
                    
                    // Set initial volume
                    player.volume(STATE.player.volume);
                    
                    if (STATE.player.isMuted) {
                        player.muted(true);
                    }

                    resolve(player);
                });

                // Handle player errors
                player.on('error', () => {
                    const error = player.error();
                    console.error('[PLAYER] Video.js error:', error);
                });

            } catch (error) {
                reject(error);
            }
        });
    },

    /* ==========================================
       STREAM PLAYBACK
       ========================================== */

    /**
     * Play a channel stream
     * @param {Object} channel - Channel object
     * @param {number} sourceIndex - Source index to use
     */
    async playChannel(channel, sourceIndex = 0) {
        if (!channel) {
            console.error('[PLAYER] No channel provided');
            return;
        }

        console.log(`[PLAYER] Playing channel: ${channel.name}`);

        // Update state
        StateManager.set('player.currentChannel', channel);
        StateManager.set('player.isLoading', true);
        StateManager.set('player.hasError', false);
        StateManager.set('player.errorMessage', '');
        StateManager.set('player.retryCount', 0);

        // Collect available sources
        const sources = this.collectSources(channel);
        STATE.player.availableSources = sources;
        STATE.player.currentSourceIndex = Math.min(sourceIndex, sources.length - 1);

        // Show loading overlay
        this.showLoading();

        // Hide placeholder
        this.hidePlaceholder();

        try {
            const source = sources[STATE.player.currentSourceIndex];
            if (!source) {
                throw new Error('No valid stream source available');
            }

            STATE.player.currentSource = source.url;

            // Play based on stream type
            await this.playStream(source);

            // Update UI
            this.updateSourceInfo(channel);
            this.updateQuickChannels();

            // Save last channel
            Utils.setToStorage(CONFIG.STORAGE_KEYS.LAST_CHANNEL, {
                id: channel.id,
                name: channel.name,
                logo: channel.logo,
                category: channel.category,
            });

            console.log(`[PLAYER] Now playing: ${channel.name}`);

        } catch (error) {
            console.error('[PLAYER] Error playing channel:', error);
            this.handlePlaybackError(error);
        }
    },

    /**
     * Play a direct URL
     * @param {string} url - Stream URL
     */
    async playDirectUrl(url) {
        if (!url || !Utils.isValidURL(url)) {
            this.showError('Invalid stream URL');
            return;
        }

        console.log(`[PLAYER] Playing direct URL: ${url}`);

        StateManager.set('player.isLoading', true);
        StateManager.set('player.hasError', false);
        StateManager.set('player.retryCount', 0);

        const channel = {
            id: Utils.generateId('direct'),
            name: 'Custom Stream',
            logo: '',
            category: 'Custom',
            quality: Utils.detectQuality(url),
            urls: [url],
        };

        STATE.player.currentChannel = channel;
        STATE.player.availableSources = [{ url, quality: channel.quality, label: 'Direct URL' }];
        STATE.player.currentSourceIndex = 0;
        STATE.player.currentSource = url;

        this.showLoading();
        this.hidePlaceholder();

        try {
            await this.playStream({ url, quality: channel.quality });
            this.updateSourceInfo(channel);
        } catch (error) {
            console.error('[PLAYER] Error playing direct URL:', error);
            this.handlePlaybackError(error);
        }
    },

    /**
     * Play HTML embed/iframe content
     * @param {string} embedCode - HTML embed code
     */
    playEmbed(embedCode) {
        const iframeSrc = Utils.extractIframeSrc(embedCode);
        
        if (!iframeSrc) {
            this.showError('Invalid embed code - no iframe found');
            return;
        }

        console.log(`[PLAYER] Playing embed: ${iframeSrc}`);

        // Hide Video.js player
        const player = STATE.player.videoJS;
        if (player) {
            player.dispose();
            STATE.player.videoJS = null;
        }

        // Create iframe overlay
        const wrapper = Utils.$('.player-wrapper');
        if (!wrapper) return;

        // Remove existing iframe
        const existingIframe = Utils.$('.embed-iframe', wrapper);
        if (existingIframe) existingIframe.remove();

        // Create iframe
        const iframe = Utils.createElement('iframe', {
            src: iframeSrc,
            className: 'embed-iframe',
            style: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                border: 'none',
                zIndex: '10',
            },
            allow: 'autoplay; encrypted-media; fullscreen',
            allowfullscreen: 'true',
        });

        wrapper.appendChild(iframe);

        // Hide placeholder and loading
        this.hidePlaceholder();
        this.hideLoading();
        this.hideError();

        // Update state
        StateManager.set('player.isPlaying', true);
        StateManager.set('player.isLoading', false);

        const channel = {
            id: Utils.generateId('embed'),
            name: 'Embedded Stream',
            logo: '',
            category: 'Embed',
        };

        STATE.player.currentChannel = channel;
        STATE.player.currentSource = iframeSrc;
        this.updateSourceInfo(channel);
    },

    /**
     * Play stream based on type (HLS, MP4, DASH, etc.)
     * @param {Object} source - Source object with url and quality
     */
    async playStream(source) {
        const url = source.url;
        const player = STATE.player.videoJS;

        if (!player) {
            throw new Error('Player not initialized');
        }

        // Reset player
        player.reset();
        
        // Dispose existing HLS instance
        if (STATE.player.hls) {
            STATE.player.hls.destroy();
            STATE.player.hls = null;
        }

        const extension = Utils.getFileExtension(url);

        // HLS Stream
        if (Utils.isHLSUrl(url)) {
            await this.playHLSStream(url, player);
        }
        // DASH Stream
        else if (Utils.isDashUrl(url)) {
            await this.playDASHStream(url, player);
        }
        // MP4/TS/WebM direct
        else if (['mp4', 'ts', 'webm', 'ogg', 'mkv'].includes(extension)) {
            await this.playDirectStream(url, player);
        }
        // Unknown - try as HLS first
        else {
            console.log('[PLAYER] Unknown stream type, trying HLS...');
            await this.playHLSStream(url, player);
        }

        // Start playback
        try {
            await player.play();
            StateManager.set('player.isPlaying', true);
            StateManager.set('player.isPaused', false);
            StateManager.set('player.isLoading', false);
            this.hideLoading();
            this.hideError();
        } catch (playError) {
            // Autoplay might be blocked
            if (playError.name === 'NotAllowedError') {
                console.warn('[PLAYER] Autoplay blocked, user interaction required');
                StateManager.set('player.isMuted', true);
                player.muted(true);
                try {
                    await player.play();
                    StateManager.set('player.isPlaying', true);
                    StateManager.set('player.isLoading', false);
                    this.hideLoading();
                    this.hideError();
                } catch (e) {
                    throw e;
                }
            } else {
                throw playError;
            }
        }
    },

    /**
     * Play HLS stream with HLS.js
     * @param {string} url - HLS stream URL
     * @param {Object} player - Video.js player
     */
    async playHLSStream(url, player) {
        console.log(`[PLAYER] Playing HLS stream: ${url}`);

        return new Promise((resolve, reject) => {
            try {
                // Check if HLS.js is available
                if (typeof Hls === 'undefined') {
                    reject(new Error('HLS.js not loaded'));
                    return;
                }

                // Check if browser supports HLS natively
                if (player.canPlayType('application/vnd.apple.mpegurl')) {
                    console.log('[PLAYER] Using native HLS support');
                    player.src({ src: url, type: 'application/x-mpegurl' });
                    player.one('loadedmetadata', () => resolve());
                    player.one('error', () => reject(player.error()));
                    return;
                }

                // Check MediaSource support
                if (!Hls.isSupported()) {
                    reject(new Error('HLS not supported in this browser'));
                    return;
                }

                // Create HLS instance
                const hls = new Hls(CONFIG.PLAYER.HLS_OPTIONS);
                STATE.player.hls = hls;

                hls.loadSource(url);
                hls.attachMedia(player.tech().el());

                hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                    console.log(`[PLAYER] HLS manifest loaded: ${data.levels.length} quality levels`);
                    STATE.player.quality = 'auto';
                    
                    // Set initial quality if available
                    if (data.levels.length > 0) {
                        hls.currentLevel = -1; // Auto quality
                    }
                    
                    resolve();
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('[PLAYER] HLS error:', data);
                    
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.log('[PLAYER] HLS network error, attempting recovery...');
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.log('[PLAYER] HLS media error, attempting recovery...');
                                hls.recoverMediaError();
                                break;
                            default:
                                hls.destroy();
                                reject(new Error(`HLS fatal error: ${data.details}`));
                                break;
                        }
                    }
                });

                hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                    console.log(`[PLAYER] Quality switched to level ${data.level}`);
                });

                // Timeout for manifest loading
                setTimeout(() => {
                    if (STATE.player.isLoading) {
                        console.warn('[PLAYER] HLS manifest load timeout');
                    }
                }, CONFIG.PLAYER.HLS_OPTIONS.manifestLoadingTimeOut);

            } catch (error) {
                reject(error);
            }
        });
    },

    /**
     * Play DASH stream
     * @param {string} url - DASH stream URL
     * @param {Object} player - Video.js player
     */
    async playDASHStream(url, player) {
        console.log(`[PLAYER] Playing DASH stream: ${url}`);
        
        player.src({
            src: url,
            type: 'application/dash+xml',
        });
        
        return new Promise((resolve, reject) => {
            player.one('loadedmetadata', () => resolve());
            player.one('error', () => reject(player.error()));
        });
    },

    /**
     * Play direct stream (MP4, TS, etc.)
     * @param {string} url - Direct stream URL
     * @param {Object} player - Video.js player
     */
    async playDirectStream(url, player) {
        console.log(`[PLAYER] Playing direct stream: ${url}`);
        
        const extension = Utils.getFileExtension(url);
        const mimeTypes = {
            'mp4': 'video/mp4',
            'ts': 'video/mp2t',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'mkv': 'video/x-matroska',
        };

        player.src({
            src: url,
            type: mimeTypes[extension] || 'video/mp4',
        });

        return new Promise((resolve, reject) => {
            player.one('loadedmetadata', () => resolve());
            player.one('error', () => reject(player.error()));
        });
    },

    /* ==========================================
       SOURCE MANAGEMENT
       ========================================== */

    /**
     * Collect all available sources for a channel
     * @param {Object} channel - Channel object
     * @returns {Array} Array of source objects
     */
    collectSources(channel) {
        const sources = [];

        // Add primary URL
        if (channel.url && Utils.isValidURL(channel.url)) {
            sources.push({
                url: channel.url,
                quality: channel.quality || 'HD',
                label: `Primary (${channel.quality || 'HD'})`,
                isPrimary: true,
            });
        }

        // Add alternative URLs
        if (Array.isArray(channel.urls)) {
            channel.urls.forEach((url, index) => {
                if (url !== channel.url && Utils.isValidURL(url)) {
                    const quality = Utils.detectQuality(url);
                    sources.push({
                        url,
                        quality,
                        label: `Source ${index + 2} (${quality})`,
                        isPrimary: false,
                    });
                }
            });
        }

        // If channel has multiple stream URLs in its data
        if (Array.isArray(channel.streams)) {
            channel.streams.forEach((stream, index) => {
                const url = stream.url || stream;
                if (typeof url === 'string' && Utils.isValidURL(url)) {
                    sources.push({
                        url,
                        quality: stream.quality || Utils.detectQuality(url),
                        label: stream.label || `Stream ${index + 1}`,
                        isPrimary: false,
                    });
                }
            });
        }

        // Remove duplicates by URL
        const uniqueSources = [];
        const seenUrls = new Set();
        sources.forEach(source => {
            if (!seenUrls.has(source.url)) {
                seenUrls.add(source.url);
                uniqueSources.push(source);
            }
        });

        return uniqueSources;
    },

    /**
     * Switch to a different source
     * @param {number} sourceIndex - Index of new source
     */
    async switchSource(sourceIndex) {
        const sources = STATE.player.availableSources;
        
        if (sourceIndex < 0 || sourceIndex >= sources.length) {
            console.error('[PLAYER] Invalid source index');
            return;
        }

        console.log(`[PLAYER] Switching to source ${sourceIndex + 1}/${sources.length}`);

        STATE.player.currentSourceIndex = sourceIndex;
        STATE.player.retryCount = 0;

        const source = sources[sourceIndex];
        STATE.player.currentSource = source.url;

        this.showLoading();
        this.hideError();

        try {
            await this.playStream(source);
            this.updateSourceInfo(STATE.player.currentChannel);
            console.log('[PLAYER] Source switched successfully');
        } catch (error) {
            console.error('[PLAYER] Error switching source:', error);
            this.handlePlaybackError(error);
        }
    },

    /**
     * Try next available source
     */
    async tryNextSource() {
        const nextIndex = STATE.player.currentSourceIndex + 1;
        const sources = STATE.player.availableSources;

        if (nextIndex < sources.length) {
            console.log('[PLAYER] Trying next source...');
            await this.switchSource(nextIndex);
        } else {
            console.log('[PLAYER] No more sources available');
            this.showError('All available sources failed. Please try again later.');
        }
    },

    /* ==========================================
       ERROR HANDLING & RETRY
       ========================================== */

    /**
     * Handle playback error with retry logic
     * @param {Error} error - Error object
     */
    handlePlaybackError(error) {
        console.error('[PLAYER] Playback error:', error);

        const retryCount = STATE.player.retryCount;
        const maxRetries = CONFIG.MAX_RETRY_ATTEMPTS;

        StateManager.set('player.hasError', true);
        StateManager.set('player.errorMessage', error.message || 'Unknown playback error');
        StateManager.set('player.isLoading', false);
        StateManager.set('player.isPlaying', false);

        this.hideLoading();

        if (retryCount < maxRetries) {
            const delay = CONFIG.RETRY_DELAYS[retryCount] || 2000;
            console.log(`[PLAYER] Retrying in ${delay / 1000}s (attempt ${retryCount + 1}/${maxRetries})...`);

            StateManager.set('player.retryCount', retryCount + 1);

            // Show retry countdown
            this.showError(`Retrying in ${delay / 1000}s... (Attempt ${retryCount + 1}/${maxRetries})`);

            STATE.timers.retryTimeout = setTimeout(async () => {
                try {
                    const source = STATE.player.availableSources[STATE.player.currentSourceIndex];
                    if (source) {
                        await this.playStream(source);
                        this.hideError();
                        this.hideLoading();
                        StateManager.set('player.isPlaying', true);
                        StateManager.set('player.hasError', false);
                        console.log('[PLAYER] Retry successful');
                    }
                } catch (retryError) {
                    console.error('[PLAYER] Retry failed:', retryError);
                    this.handlePlaybackError(retryError);
                }
            }, delay);
        } else {
            console.log('[PLAYER] Max retries reached, trying next source...');
            this.showError('Stream failed. Try next source?');
            
            // Auto-try next source after a delay
            STATE.timers.retryTimeout = setTimeout(() => {
                this.tryNextSource();
            }, 2000);
        }
    },

    /* ==========================================
       PLAYER CONTROLS
       ========================================== */

    /**
     * Toggle play/pause
     */
    togglePlay() {
        const player = STATE.player.videoJS;
        if (!player) return;

        if (player.paused()) {
            player.play();
            StateManager.set('player.isPlaying', true);
            StateManager.set('player.isPaused', false);
        } else {
            player.pause();
            StateManager.set('player.isPlaying', false);
            StateManager.set('player.isPaused', true);
        }
    },

    /**
     * Toggle mute
     */
    toggleMute() {
        const player = STATE.player.videoJS;
        if (!player) return;

        const muted = !player.muted();
        player.muted(muted);
        StateManager.set('player.isMuted', muted);
        
        // Save preference
        Utils.setToStorage(CONFIG.STORAGE_KEYS.USER_PREFERENCES, {
            volume: STATE.player.volume,
            isMuted: muted,
        });
    },

    /**
     * Set volume
     * @param {number} level - Volume level (0-1)
     */
    setVolume(level) {
        const player = STATE.player.videoJS;
        if (!player) return;

        const vol = Math.max(0, Math.min(1, level));
        player.volume(vol);
        StateManager.set('player.volume', vol);

        if (vol > 0 && player.muted()) {
            player.muted(false);
            StateManager.set('player.isMuted', false);
        }

        Utils.setToStorage(CONFIG.STORAGE_KEYS.USER_PREFERENCES, {
            volume: vol,
            isMuted: STATE.player.isMuted,
        });
    },

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        const player = STATE.player.videoJS;
        if (!player) return;

        if (player.isFullscreen()) {
            player.exitFullscreen();
            StateManager.set('player.isFullscreen', false);
        } else {
            player.requestFullscreen();
            StateManager.set('player.isFullscreen', true);
        }
    },

    /**
     * Toggle Picture-in-Picture
     */
    async togglePiP() {
        try {
            const videoElement = STATE.player.videoElement;
            if (!videoElement) return;

            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                StateManager.set('player.isPiP', false);
            } else if (document.pictureInPictureEnabled) {
                await videoElement.requestPictureInPicture();
                StateManager.set('player.isPiP', true);
            }
        } catch (error) {
            console.error('[PLAYER] PiP error:', error);
        }
    },

    /**
     * Stop playback
     */
    stop() {
        const player = STATE.player.videoJS;
        if (player) {
            player.pause();
            player.reset();
        }

        if (STATE.player.hls) {
            STATE.player.hls.destroy();
            STATE.player.hls = null;
        }

        STATE.player.currentChannel = null;
        STATE.player.currentSource = null;
        STATE.player.isPlaying = false;
        STATE.player.isPaused = true;
        STATE.player.hasError = false;

        this.hideLoading();
        this.hideError();
        this.showPlaceholder();
        this.updateSourceInfo(null);

        console.log('[PLAYER] Playback stopped');
    },

    /* ==========================================
       UI OVERLAYS
       ========================================== */

    /**
     * Show loading overlay
     */
    showLoading() {
        const overlay = Utils.$('#player-loading');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
        StateManager.set('player.isLoading', true);
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = Utils.$('#player-loading');
        if (overlay) {
            overlay.classList.add('hidden');
        }
        StateManager.set('player.isLoading', false);
    },

    /**
     * Show error overlay
     * @param {string} message - Error message
     */
    showError(message) {
        const overlay = Utils.$('#player-error');
        const messageEl = Utils.$('#error-message');
        
        if (overlay) {
            overlay.classList.remove('hidden');
        }
        if (messageEl) {
            messageEl.textContent = message;
        }
        
        StateManager.set('player.hasError', true);
        StateManager.set('player.errorMessage', message);
    },

    /**
     * Hide error overlay
     */
    hideError() {
        const overlay = Utils.$('#player-error');
        if (overlay) {
            overlay.classList.add('hidden');
        }
        StateManager.set('player.hasError', false);
    },

    /**
     * Show placeholder
     */
    showPlaceholder() {
        const placeholder = Utils.$('#player-placeholder');
        if (placeholder) {
            placeholder.classList.remove('hidden');
        }
    },

    /**
     * Hide placeholder
     */
    hidePlaceholder() {
        const placeholder = Utils.$('#player-placeholder');
        if (placeholder) {
            placeholder.classList.add('hidden');
        }
    },

    /**
     * Update source info bar
     * @param {Object|null} channel - Current channel
     */
    updateSourceInfo(channel) {
        const sourceInfo = Utils.$('#source-info');
        const channelName = Utils.$('#current-channel-name');

        if (sourceInfo && channelName) {
            if (channel) {
                sourceInfo.classList.remove('hidden');
                channelName.textContent = channel.name || 'Unknown Channel';
            } else {
                sourceInfo.classList.add('hidden');
                channelName.textContent = 'No Channel';
            }
        }
    },

    /**
     * Update quick channel buttons
     */
    updateQuickChannels() {
        const container = Utils.$('#quick-channel-list');
        if (!container) return;

        const channels = STATE.playlist.filteredChannels.slice(0, CONFIG.UI.MAX_QUICK_CHANNELS);
        
        Utils.emptyElement(container);
        
        channels.forEach(channel => {
            const btn = Utils.createElement('button', {
                className: 'quick-channel-btn',
                text: Utils.truncate(channel.name, 15),
                title: channel.name,
                onClick: () => this.playChannel(channel),
            });
            
            if (channel.logo) {
                const img = Utils.createElement('img', {
                    src: channel.logo,
                    alt: channel.name,
                    style: { width: '20px', height: '20px', borderRadius: '4px' },
                    onerror: function() { this.style.display = 'none'; },
                });
                btn.prepend(img);
            }
            
            container.appendChild(btn);
        });
    },

    /* ==========================================
       EVENT HANDLERS
       ========================================== */

    /**
     * Set up player event listeners
     */
    setupPlayerEvents() {
        const player = STATE.player.videoJS;
        if (!player) return;

        // Play event
        player.on('play', () => {
            StateManager.set('player.isPlaying', true);
            StateManager.set('player.isPaused', false);
        });

        // Pause event
        player.on('pause', () => {
            StateManager.set('player.isPlaying', false);
            StateManager.set('player.isPaused', true);
        });

        // Volume change
        player.on('volumechange', () => {
            StateManager.set('player.volume', player.volume());
            StateManager.set('player.isMuted', player.muted());
        });

        // Fullscreen change
        player.on('fullscreenchange', () => {
            StateManager.set('player.isFullscreen', player.isFullscreen());
        });

        // Time update
        player.on('timeupdate', () => {
            STATE.player.currentTime = player.currentTime();
            STATE.player.duration = player.duration();
        });

        // Waiting/buffering
        player.on('waiting', () => {
            this.showLoading();
        });

        // Can play
        player.on('canplay', () => {
            this.hideLoading();
        });

        // Ended
        player.on('ended', () => {
            StateManager.set('player.isPlaying', false);
            console.log('[PLAYER] Stream ended');
        });

        // Dispose
        player.on('dispose', () => {
            console.log('[PLAYER] Player disposed');
        });
    },

    /**
     * Set up keyboard controls
     */
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            // Only handle if not in an input field
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

            const key = event.key.toLowerCase();

            switch (key) {
                case ' ':
                    event.preventDefault();
                    this.togglePlay();
                    break;
                case 'f':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.toggleFullscreen();
                    }
                    break;
                case 'm':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.toggleMute();
                    }
                    break;
                case 'p':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.togglePiP();
                    }
                    break;
                case 'arrowleft':
                    event.preventDefault();
                    this.seekBy(-10);
                    break;
                case 'arrowright':
                    event.preventDefault();
                    this.seekBy(10);
                    break;
                case 'arrowup':
                    event.preventDefault();
                    this.setVolume(STATE.player.volume + 0.1);
                    break;
                case 'arrowdown':
                    event.preventDefault();
                    this.setVolume(STATE.player.volume - 0.1);
                    break;
                case 'escape':
                    if (STATE.player.isFullscreen) {
                        this.toggleFullscreen();
                    }
                    break;
            }
        });
    },

    /**
     * Seek by seconds
     * @param {number} seconds - Seconds to seek
     */
    seekBy(seconds) {
        const player = STATE.player.videoJS;
        if (player) {
            const newTime = player.currentTime() + seconds;
            player.currentTime(Math.max(0, newTime));
        }
    },

    /**
     * Handle page visibility changes
     */
    setupVisibilityHandling() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page hidden - could pause or continue based on preference
                console.log('[PLAYER] Page hidden');
            } else {
                // Page visible again
                console.log('[PLAYER] Page visible');
                // Resume if was playing
                const player = STATE.player.videoJS;
                if (player && STATE.player.isPlaying && player.paused()) {
                    player.play().catch(() => {});
                }
            }
        });
    },

    /* ==========================================
       STATE RESTORATION
       ========================================== */

    /**
     * Restore previous player state
     */
    restorePlayerState() {
        const preferences = Utils.getFromStorage(CONFIG.STORAGE_KEYS.USER_PREFERENCES);
        if (preferences) {
            if (preferences.volume !== undefined) {
                STATE.player.volume = preferences.volume;
                if (STATE.player.videoJS) {
                    STATE.player.videoJS.volume(preferences.volume);
                }
            }
            if (preferences.isMuted !== undefined) {
                STATE.player.isMuted = preferences.isMuted;
                if (STATE.player.videoJS) {
                    STATE.player.videoJS.muted(preferences.isMuted);
                }
            }
        }
    },

    /* ==========================================
       CLEANUP
       ========================================== */

    /**
     * Destroy player and cleanup
     */
    destroy() {
        console.log('[PLAYER] Destroying player...');

        // Clear timers
        if (STATE.timers.retryTimeout) {
            clearTimeout(STATE.timers.retryTimeout);
            STATE.timers.retryTimeout = null;
        }

        // Destroy HLS
        if (STATE.player.hls) {
            STATE.player.hls.destroy();
            STATE.player.hls = null;
        }

        // Dispose Video.js
        if (STATE.player.videoJS) {
            STATE.player.videoJS.dispose();
            STATE.player.videoJS = null;
        }

        // Remove embed iframes
        const wrapper = Utils.$('.player-wrapper');
        if (wrapper) {
            const iframes = Utils.$$('.embed-iframe', wrapper);
            iframes.forEach(iframe => iframe.remove());
        }

        console.log('[PLAYER] Player destroyed');
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerModule;
}
