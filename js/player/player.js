/*=============================================
  XBZ Prime TV - Video Player Module
  Video.js + HLS.js Integration
  Improved Error Logging & Debugging
  =============================================*/

'use strict';

var PlayerModule = {
    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize the video player
     */
    init: async function() {
        console.log('[PLAYER] ========================================');
        console.log('[PLAYER] Initializing video player...');
        console.log('[PLAYER] Environment:', CONFIG.IS_LOCAL ? 'LOCAL' : 'PRODUCTION');
        console.log('[PLAYER] CORS Proxy:', CONFIG.CORS_PROXY || 'None');
        console.log('[PLAYER] HLS.js supported:', typeof Hls !== 'undefined' ? 'YES' : 'NO');
        console.log('[PLAYER] Video.js supported:', typeof videojs !== 'undefined' ? 'YES' : 'NO');

        try {
            var videoElement = Utils.$('#main-player');
            if (!videoElement) {
                console.error('[PLAYER] ERROR: Video element #main-player not found in DOM');
                throw new Error('Video element not found');
            }
            console.log('[PLAYER] Video element found:', videoElement.id);

            STATE.player.videoElement = videoElement;

            await this.initVideoJS(videoElement);
            this.setupPlayerEvents();
            this.setupKeyboardControls();
            this.setupVisibilityHandling();
            this.restorePlayerState();

            console.log('[PLAYER] Video player initialized successfully');
            console.log('[PLAYER] ========================================');
            return STATE.player.videoJS;

        } catch (error) {
            console.error('[PLAYER] ========================================');
            console.error('[PLAYER] FATAL: Player initialization error');
            console.error('[PLAYER] Error name:', error.name);
            console.error('[PLAYER] Error message:', error.message);
            console.error('[PLAYER] Error stack:', error.stack);
            console.error('[PLAYER] ========================================');
            this.showError('Failed to initialize player: ' + error.message);
            throw error;
        }
    },

    /**
     * Initialize Video.js player
     */
    initVideoJS: function(videoElement) {
        var self = this;
        
        return new Promise(function(resolve, reject) {
            try {
                console.log('[PLAYER] Creating Video.js instance...');
                
                var options = {
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
                            'pictureInPictureToggle',
                            'fullscreenToggle'
                        ]
                    },
                    userActions: {
                        hotkeys: true
                    },
                    html5: {
                        nativeTextTracks: false,
                        hls: {
                            overrideNative: true
                        },
                        vhs: {
                            overrideNative: true
                        }
                    }
                };

                console.log('[PLAYER] Video.js options:', JSON.stringify(options, null, 2));

                var player = videojs(videoElement, options, function onPlayerReady() {
                    console.log('[PLAYER] Video.js player ready event fired');
                    console.log('[PLAYER] Player ID:', player.id());
                    console.log('[PLAYER] Player tech name:', player.techName_);
                    
                    STATE.player.videoJS = player;
                    player.volume(STATE.player.volume);
                    
                    if (STATE.player.isMuted) {
                        player.muted(true);
                        console.log('[PLAYER] Player muted by default');
                    }

                    console.log('[PLAYER] Video.js ready - Tech:', player.techName_);
                    resolve(player);
                });

                player.on('error', function() {
                    var error = player.error();
                    console.error('[PLAYER] Video.js error event fired');
                    console.error('[PLAYER] Error code:', error ? error.code : 'unknown');
                    console.error('[PLAYER] Error message:', error ? error.message : 'unknown');
                });

                console.log('[PLAYER] Video.js instance created');

            } catch (error) {
                console.error('[PLAYER] Video.js initialization error:', error);
                reject(error);
            }
        });
    },

    /* ==========================================
       STREAM PLAYBACK
       ========================================== */

    /**
     * Play a channel stream
     */
    playChannel: async function(channel, sourceIndex) {
        if (!channel) {
            console.error('[PLAYER] playChannel called with null/undefined channel');
            this.showError('No channel provided');
            return;
        }

        sourceIndex = sourceIndex || 0;

        console.log('[PLAYER] ========================================');
        console.log('[PLAYER] Playing channel:', channel.name);
        console.log('[PLAYER] Channel ID:', channel.id);
        console.log('[PLAYER] Channel URL:', channel.url ? channel.url.substring(0, 80) + '...' : 'NONE');
        console.log('[PLAYER] Channel category:', channel.category);
        console.log('[PLAYER] Channel quality:', channel.quality);
        console.log('[PLAYER] Source index:', sourceIndex);

        StateManager.set('player.currentChannel', channel);
        StateManager.set('player.isLoading', true);
        StateManager.set('player.hasError', false);
        StateManager.set('player.errorMessage', '');
        StateManager.set('player.retryCount', 0);

        var sources = this.collectSources(channel);
        console.log('[PLAYER] Available sources:', sources.length);
        sources.forEach(function(src, i) {
            console.log('[PLAYER]   Source ' + (i + 1) + ':', src.label, '-', src.url.substring(0, 60) + '...');
        });

        STATE.player.availableSources = sources;
        STATE.player.currentSourceIndex = Math.min(sourceIndex, sources.length - 1);

        this.showLoading();
        this.hidePlaceholder();

        try {
            var source = sources[STATE.player.currentSourceIndex];
            if (!source) {
                console.error('[PLAYER] No valid source found at index', STATE.player.currentSourceIndex);
                throw new Error('No valid stream source available');
            }

            console.log('[PLAYER] Selected source:', source.label);
            console.log('[PLAYER] Source URL:', source.url.substring(0, 80) + '...');
            console.log('[PLAYER] Source quality:', source.quality);
            console.log('[PLAYER] URL extension:', Utils.getFileExtension(source.url));

            STATE.player.currentSource = source.url;
            await this.playStream(source);

            this.updateSourceInfo(channel);
            this.updateQuickChannels();

            Utils.setToStorage(CONFIG.STORAGE_KEYS.LAST_CHANNEL, {
                id: channel.id,
                name: channel.name,
                logo: channel.logo,
                category: channel.category
            });

            console.log('[PLAYER] SUCCESS: Now playing - ' + channel.name);
            console.log('[PLAYER] ========================================');

        } catch (error) {
            console.error('[PLAYER] ========================================');
            console.error('[PLAYER] ERROR playing channel:', channel.name);
            console.error('[PLAYER] Error name:', error.name);
            console.error('[PLAYER] Error message:', error.message);
            console.error('[PLAYER] Error stack:', error.stack);
            console.error('[PLAYER] ========================================');
            this.handlePlaybackError(error);
        }
    },

    /**
     * Play a direct URL
     */
    playDirectUrl: async function(url) {
        console.log('[PLAYER] ========================================');
        console.log('[PLAYER] Playing direct URL');
        console.log('[PLAYER] URL:', url ? url.substring(0, 100) + '...' : 'NONE');
        console.log('[PLAYER] Extension:', Utils.getFileExtension(url));

        if (!url || !Utils.isValidURL(url)) {
            console.error('[PLAYER] Invalid URL provided');
            this.showError('Invalid stream URL');
            return;
        }

        StateManager.set('player.isLoading', true);
        StateManager.set('player.hasError', false);
        StateManager.set('player.retryCount', 0);

        var channel = {
            id: Utils.generateId('direct'),
            name: 'Custom Stream',
            logo: '',
            category: 'Custom',
            quality: Utils.detectQuality(url),
            urls: [url]
        };

        STATE.player.currentChannel = channel;
        STATE.player.availableSources = [{ url: url, quality: channel.quality, label: 'Direct URL' }];
        STATE.player.currentSourceIndex = 0;
        STATE.player.currentSource = url;

        this.showLoading();
        this.hidePlaceholder();

        try {
            await this.playStream({ url: url, quality: channel.quality });
            this.updateSourceInfo(channel);
            console.log('[PLAYER] SUCCESS: Direct URL playing');
            console.log('[PLAYER] ========================================');
        } catch (error) {
            console.error('[PLAYER] ========================================');
            console.error('[PLAYER] ERROR playing direct URL');
            console.error('[PLAYER] Error:', error.message);
            console.error('[PLAYER] ========================================');
            this.handlePlaybackError(error);
        }
    },

    /**
     * Play HTML embed/iframe content
     */
    playEmbed: function(embedCode) {
        console.log('[PLAYER] Playing HTML embed');
        console.log('[PLAYER] Embed code length:', embedCode ? embedCode.length : 0);

        var iframeSrc = Utils.extractIframeSrc(embedCode);
        
        if (!iframeSrc) {
            console.error('[PLAYER] No iframe src found in embed code');
            this.showError('Invalid embed code - no iframe found');
            return;
        }

        console.log('[PLAYER] Iframe src:', iframeSrc);

        var player = STATE.player.videoJS;
        if (player) {
            console.log('[PLAYER] Disposing Video.js player for embed');
            player.dispose();
            STATE.player.videoJS = null;
        }

        var wrapper = Utils.$('.player-wrapper');
        if (!wrapper) {
            console.error('[PLAYER] Player wrapper not found');
            return;
        }

        var existingIframe = Utils.$('.embed-iframe', wrapper);
        if (existingIframe) {
            console.log('[PLAYER] Removing existing embed iframe');
            existingIframe.remove();
        }

        var iframe = Utils.createElement('iframe', {
            src: iframeSrc,
            className: 'embed-iframe',
            style: {
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                border: 'none',
                zIndex: '10'
            },
            allow: 'autoplay; encrypted-media; fullscreen',
            allowfullscreen: 'true'
        });

        wrapper.appendChild(iframe);
        console.log('[PLAYER] Embed iframe added to DOM');

        this.hidePlaceholder();
        this.hideLoading();
        this.hideError();

        StateManager.set('player.isPlaying', true);
        StateManager.set('player.isLoading', false);

        var channel = {
            id: Utils.generateId('embed'),
            name: 'Embedded Stream',
            logo: '',
            category: 'Embed'
        };

        STATE.player.currentChannel = channel;
        STATE.player.currentSource = iframeSrc;
        this.updateSourceInfo(channel);
        console.log('[PLAYER] SUCCESS: Embed rendered');
    },

    /**
     * Play stream based on type
     */
    playStream: async function(source) {
        var url = source.url;
        var player = STATE.player.videoJS;

        console.log('[PLAYER] --- Playing Stream ---');
        console.log('[PLAYER] URL:', url.substring(0, 100) + '...');
        console.log('[PLAYER] Quality:', source.quality);

        if (!player) {
            console.error('[PLAYER] Video.js player not initialized');
            throw new Error('Player not initialized');
        }

        console.log('[PLAYER] Resetting player...');
        player.reset();
        
        if (STATE.player.hls) {
            console.log('[PLAYER] Destroying existing HLS instance');
            STATE.player.hls.destroy();
            STATE.player.hls = null;
        }

        var extension = Utils.getFileExtension(url);
        console.log('[PLAYER] Stream type detected:', extension);

        if (Utils.isHLSUrl(url)) {
            console.log('[PLAYER] Stream type: HLS (m3u8)');
            await this.playHLSStream(url, player);
        } else if (Utils.isDashUrl(url)) {
            console.log('[PLAYER] Stream type: DASH (mpd)');
            await this.playDASHStream(url, player);
        } else if (['mp4', 'ts', 'webm', 'ogg', 'mkv'].indexOf(extension) !== -1) {
            console.log('[PLAYER] Stream type: Direct (' + extension + ')');
            await this.playDirectStream(url, player);
        } else {
            console.log('[PLAYER] Unknown stream type, trying HLS first...');
            await this.playHLSStream(url, player);
        }

        try {
            console.log('[PLAYER] Attempting playback...');
            await player.play();
            StateManager.set('player.isPlaying', true);
            StateManager.set('player.isPaused', false);
            StateManager.set('player.isLoading', false);
            this.hideLoading();
            this.hideError();
            console.log('[PLAYER] Playback started successfully');
        } catch (playError) {
            console.warn('[PLAYER] Initial play attempt failed:', playError.name, '-', playError.message);
            
            if (playError.name === 'NotAllowedError') {
                console.log('[PLAYER] Autoplay blocked, trying muted...');
                StateManager.set('player.isMuted', true);
                player.muted(true);
                try {
                    await player.play();
                    StateManager.set('player.isPlaying', true);
                    StateManager.set('player.isLoading', false);
                    this.hideLoading();
                    this.hideError();
                    console.log('[PLAYER] Playback started (muted)');
                } catch (e) {
                    console.error('[PLAYER] Muted play also failed:', e.message);
                    throw e;
                }
            } else {
                throw playError;
            }
        }
    },

    /**
     * Play HLS stream with HLS.js
     */
    playHLSStream: function(url, player) {
        var self = this;
        
        console.log('[PLAYER] --- HLS Stream Setup ---');
        console.log('[PLAYER] URL:', url.substring(0, 100) + '...');
        console.log('[PLAYER] Native HLS support:', player.canPlayType('application/vnd.apple.mpegurl') ? 'YES' : 'NO');
        console.log('[PLAYER] HLS.js available:', typeof Hls !== 'undefined' ? 'YES' : 'NO');

        return new Promise(function(resolve, reject) {
            try {
                if (typeof Hls === 'undefined') {
                    console.error('[PLAYER] HLS.js library not loaded');
                    reject(new Error('HLS.js not loaded. Check CDN connection.'));
                    return;
                }

                if (player.canPlayType('application/vnd.apple.mpegurl')) {
                    console.log('[PLAYER] Using NATIVE HLS support (Safari)');
                    player.src({ src: url, type: 'application/x-mpegurl' });
                    
                    var loadTimeout = setTimeout(function() {
                        console.warn('[PLAYER] HLS load timeout (10s)');
                    }, 10000);
                    
                    player.one('loadedmetadata', function() {
                        clearTimeout(loadTimeout);
                        console.log('[PLAYER] Native HLS metadata loaded');
                        resolve();
                    });
                    
                    player.one('error', function() {
                        clearTimeout(loadTimeout);
                        var err = player.error();
                        console.error('[PLAYER] Native HLS error:', err);
                        reject(err || new Error('Native HLS playback error'));
                    });
                    return;
                }

                if (!Hls.isSupported()) {
                    console.error('[PLAYER] HLS.js not supported in this browser');
                    console.error('[PLAYER] MSE support:', 'MediaSource' in window);
                    reject(new Error('HLS not supported. Browser may not support MediaSource Extensions.'));
                    return;
                }

                console.log('[PLAYER] Creating HLS.js instance...');
                console.log('[PLAYER] HLS config:', JSON.stringify(CONFIG.PLAYER.HLS_OPTIONS));
                
                var hls = new Hls(CONFIG.PLAYER.HLS_OPTIONS);
                STATE.player.hls = hls;

                hls.loadSource(url);
                hls.attachMedia(player.tech().el());
                console.log('[PLAYER] HLS source loaded and attached');

                hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
                    console.log('[PLAYER] HLS MANIFEST PARSED');
                    console.log('[PLAYER]   Levels:', data.levels.length);
                    console.log('[PLAYER]   Duration:', data.levels[0] ? data.levels[0].details ? data.levels[0].details.totalduration : 'LIVE' : 'unknown');
                    console.log('[PLAYER]   Audio tracks:', data.audioTracks.length);
                    
                    data.levels.forEach(function(level, i) {
                        console.log('[PLAYER]   Level ' + i + ': ' + level.width + 'x' + level.height + ' @ ' + (level.bitrate / 1000).toFixed(0) + 'kbps');
                    });
                    
                    STATE.player.quality = 'auto';
                    hls.currentLevel = -1;
                    resolve();
                });

                hls.on(Hls.Events.LEVEL_SWITCHED, function(event, data) {
                    console.log('[PLAYER] HLS Quality switched to level', data.level);
                });

                hls.on(Hls.Events.FRAG_LOADING, function(event, data) {
                    console.log('[PLAYER] HLS Loading fragment:', data.frag ? data.frag.url.substring(data.frag.url.length - 40) : 'unknown');
                });

                hls.on(Hls.Events.FRAG_LOADED, function(event, data) {
                    console.log('[PLAYER] HLS Fragment loaded successfully');
                });

                hls.on(Hls.Events.ERROR, function(event, data) {
                    console.error('[PLAYER] HLS ERROR EVENT');
                    console.error('[PLAYER]   Type:', data.type);
                    console.error('[PLAYER]   Details:', data.details);
                    console.error('[PLAYER]   Fatal:', data.fatal);
                    console.error('[PLAYER]   Reason:', data.reason);
                    
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.log('[PLAYER] HLS network error, attempting recovery...');
                                console.log('[PLAYER]   HTTP code:', data.response ? data.response.code : 'unknown');
                                console.log('[PLAYER]   URL:', data.url ? data.url.substring(0, 80) + '...' : 'unknown');
                                hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.log('[PLAYER] HLS media error, attempting recovery...');
                                hls.recoverMediaError();
                                break;
                            default:
                                console.error('[PLAYER] HLS fatal error, destroying instance');
                                hls.destroy();
                                reject(new Error('HLS fatal error: ' + data.details + (data.reason ? ' - ' + data.reason : '')));
                                break;
                        }
                    }
                });

                var manifestTimeout = setTimeout(function() {
                    console.warn('[PLAYER] HLS manifest load timeout (' + CONFIG.PLAYER.HLS_OPTIONS.manifestLoadingTimeOut + 'ms)');
                }, CONFIG.PLAYER.HLS_OPTIONS.manifestLoadingTimeOut);

                hls.on(Hls.Events.MANIFEST_PARSED, function() {
                    clearTimeout(manifestTimeout);
                });

            } catch (error) {
                console.error('[PLAYER] HLS setup exception:', error);
                reject(error);
            }
        });
    },

    /**
     * Play DASH stream
     */
    playDASHStream: function(url, player) {
        console.log('[PLAYER] --- DASH Stream Setup ---');
        console.log('[PLAYER] URL:', url.substring(0, 100) + '...');
        
        player.src({
            src: url,
            type: 'application/dash+xml'
        });
        
        return new Promise(function(resolve, reject) {
            player.one('loadedmetadata', function() {
                console.log('[PLAYER] DASH metadata loaded');
                resolve();
            });
            player.one('error', function() {
                var err = player.error();
                console.error('[PLAYER] DASH error:', err);
                reject(err || new Error('DASH playback error'));
            });
        });
    },

    /**
     * Play direct stream (MP4, TS, etc.)
     */
    playDirectStream: function(url, player) {
        console.log('[PLAYER] --- Direct Stream Setup ---');
        console.log('[PLAYER] URL:', url.substring(0, 100) + '...');
        
        var extension = Utils.getFileExtension(url);
        var mimeTypes = {
            'mp4': 'video/mp4',
            'ts': 'video/mp2t',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'mkv': 'video/x-matroska'
        };

        var mimeType = mimeTypes[extension] || 'video/mp4';
        console.log('[PLAYER] MIME type:', mimeType);

        player.src({
            src: url,
            type: mimeType
        });

        return new Promise(function(resolve, reject) {
            player.one('loadedmetadata', function() {
                console.log('[PLAYER] Direct stream metadata loaded');
                resolve();
            });
            player.one('error', function() {
                var err = player.error();
                console.error('[PLAYER] Direct stream error:', err);
                reject(err || new Error('Direct stream playback error'));
            });
        });
    },

    /* ==========================================
       SOURCE MANAGEMENT
       ========================================== */

    /**
     * Collect all available sources for a channel
     */
    collectSources: function(channel) {
        console.log('[PLAYER] Collecting sources for:', channel.name);
        var sources = [];

        if (channel.url && Utils.isValidURL(channel.url)) {
            sources.push({
                url: channel.url,
                quality: channel.quality || 'HD',
                label: 'Primary (' + (channel.quality || 'HD') + ')',
                isPrimary: true
            });
            console.log('[PLAYER]   Added primary URL');
        } else {
            console.warn('[PLAYER]   Channel has no valid primary URL');
        }

        if (Array.isArray(channel.urls)) {
            channel.urls.forEach(function(url, index) {
                if (url !== channel.url && Utils.isValidURL(url)) {
                    var quality = Utils.detectQuality(url);
                    sources.push({
                        url: url,
                        quality: quality,
                        label: 'Source ' + (index + 2) + ' (' + quality + ')',
                        isPrimary: false
                    });
                    console.log('[PLAYER]   Added alternative URL #' + (index + 2));
                }
            });
        }

        var uniqueSources = [];
        var seenUrls = new Set();
        sources.forEach(function(source) {
            if (!seenUrls.has(source.url)) {
                seenUrls.add(source.url);
                uniqueSources.push(source);
            }
        });

        console.log('[PLAYER]   Total unique sources:', uniqueSources.length);
        return uniqueSources;
    },

    /**
     * Switch to a different source
     */
    switchSource: async function(sourceIndex) {
        var sources = STATE.player.availableSources;
        
        console.log('[PLAYER] Switching source to index:', sourceIndex, '/', sources.length);
        
        if (sourceIndex < 0 || sourceIndex >= sources.length) {
            console.error('[PLAYER] Invalid source index');
            return;
        }

        STATE.player.currentSourceIndex = sourceIndex;
        STATE.player.retryCount = 0;

        var source = sources[sourceIndex];
        STATE.player.currentSource = source.url;

        console.log('[PLAYER] New source:', source.label);
        console.log('[PLAYER] New URL:', source.url.substring(0, 80) + '...');

        this.showLoading();
        this.hideError();

        try {
            await this.playStream(source);
            this.updateSourceInfo(STATE.player.currentChannel);
            console.log('[PLAYER] Source switched successfully');
        } catch (error) {
            console.error('[PLAYER] Error switching source:', error.message);
            this.handlePlaybackError(error);
        }
    },

    /**
     * Try next available source
     */
    tryNextSource: async function() {
        var nextIndex = STATE.player.currentSourceIndex + 1;
        var sources = STATE.player.availableSources;

        console.log('[PLAYER] Trying next source. Current:', STATE.player.currentSourceIndex, 'Next:', nextIndex, 'Total:', sources.length);

        if (nextIndex < sources.length) {
            console.log('[PLAYER] Switching to next source...');
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
     */
    handlePlaybackError: function(error) {
        console.error('[PLAYER] ========================================');
        console.error('[PLAYER] HANDLING PLAYBACK ERROR');
        console.error('[PLAYER] Error name:', error.name);
        console.error('[PLAYER] Error message:', error.message);
        console.error('[PLAYER] Error stack:', error.stack);
        
        var retryCount = STATE.player.retryCount;
        var maxRetries = CONFIG.MAX_RETRY_ATTEMPTS;
        var currentSource = STATE.player.currentSource;
        var currentSourceIndex = STATE.player.currentSourceIndex;
        var totalSources = STATE.player.availableSources.length;

        console.error('[PLAYER] Retry count:', retryCount, '/', maxRetries);
        console.error('[PLAYER] Current source index:', currentSourceIndex, '/', totalSources);
        console.error('[PLAYER] Current URL:', currentSource ? currentSource.substring(0, 80) + '...' : 'NONE');

        StateManager.set('player.hasError', true);
        StateManager.set('player.errorMessage', error.message || 'Unknown playback error');
        StateManager.set('player.isLoading', false);
        StateManager.set('player.isPlaying', false);

        this.hideLoading();

        if (retryCount < maxRetries) {
            var delay = CONFIG.RETRY_DELAYS[retryCount] || 2000;
            console.log('[PLAYER] Scheduling retry ' + (retryCount + 1) + '/' + maxRetries + ' in ' + delay + 'ms...');

            StateManager.set('player.retryCount', retryCount + 1);

            this.showError('Retrying in ' + (delay / 1000) + 's... (Attempt ' + (retryCount + 1) + '/' + maxRetries + ')');

            var self = this;
            STATE.timers.retryTimeout = setTimeout(async function() {
                try {
                    console.log('[PLAYER] Executing retry attempt ' + (retryCount + 1));
                    var source = STATE.player.availableSources[STATE.player.currentSourceIndex];
                    if (source) {
                        await self.playStream(source);
                        self.hideError();
                        self.hideLoading();
                        StateManager.set('player.isPlaying', true);
                        StateManager.set('player.hasError', false);
                        console.log('[PLAYER] Retry SUCCESSFUL!');
                        console.error('[PLAYER] ========================================');
                    }
                } catch (retryError) {
                    console.error('[PLAYER] Retry failed:', retryError.message);
                    self.handlePlaybackError(retryError);
                }
            }, delay);
        } else {
            console.log('[PLAYER] Max retries reached');
            
            if (currentSourceIndex + 1 < totalSources) {
                console.log('[PLAYER] Auto-switching to next source in 2s...');
                this.showError('Stream failed. Trying next source...');
                
                var self2 = this;
                STATE.timers.retryTimeout = setTimeout(function() {
                    self2.tryNextSource();
                }, 2000);
            } else {
                console.error('[PLAYER] ALL SOURCES EXHAUSTED');
                this.showError('All sources failed. Please try again later or check your internet connection.');
                console.error('[PLAYER] ========================================');
            }
        }
    },

    /* ==========================================
       PLAYER CONTROLS
       ========================================== */

    togglePlay: function() {
        var player = STATE.player.videoJS;
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

    toggleMute: function() {
        var player = STATE.player.videoJS;
        if (!player) return;

        var muted = !player.muted();
        player.muted(muted);
        StateManager.set('player.isMuted', muted);
    },

    setVolume: function(level) {
        var player = STATE.player.videoJS;
        if (!player) return;

        var vol = Math.max(0, Math.min(1, level));
        player.volume(vol);
        StateManager.set('player.volume', vol);

        if (vol > 0 && player.muted()) {
            player.muted(false);
            StateManager.set('player.isMuted', false);
        }
    },

    toggleFullscreen: function() {
        var player = STATE.player.videoJS;
        if (!player) return;

        if (player.isFullscreen()) {
            player.exitFullscreen();
            StateManager.set('player.isFullscreen', false);
        } else {
            player.requestFullscreen();
            StateManager.set('player.isFullscreen', true);
        }
    },

    togglePiP: async function() {
        try {
            var videoElement = STATE.player.videoElement;
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

    stop: function() {
        console.log('[PLAYER] Stopping playback');
        var player = STATE.player.videoJS;
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
    },

    seekBy: function(seconds) {
        var player = STATE.player.videoJS;
        if (player) {
            var newTime = player.currentTime() + seconds;
            player.currentTime(Math.max(0, newTime));
        }
    },

    /* ==========================================
       UI OVERLAYS
       ========================================== */

    showLoading: function() {
        var overlay = Utils.$('#player-loading');
        if (overlay) overlay.classList.remove('hidden');
        StateManager.set('player.isLoading', true);
    },

    hideLoading: function() {
        var overlay = Utils.$('#player-loading');
        if (overlay) overlay.classList.add('hidden');
        StateManager.set('player.isLoading', false);
    },

    showError: function(message) {
        var overlay = Utils.$('#player-error');
        var messageEl = Utils.$('#error-message');
        
        if (overlay) overlay.classList.remove('hidden');
        if (messageEl) messageEl.textContent = message;
        
        StateManager.set('player.hasError', true);
        StateManager.set('player.errorMessage', message);
    },

    hideError: function() {
        var overlay = Utils.$('#player-error');
        if (overlay) overlay.classList.add('hidden');
        StateManager.set('player.hasError', false);
    },

    showPlaceholder: function() {
        var placeholder = Utils.$('#player-placeholder');
        if (placeholder) placeholder.classList.remove('hidden');
    },

    hidePlaceholder: function() {
        var placeholder = Utils.$('#player-placeholder');
        if (placeholder) placeholder.classList.add('hidden');
    },

    updateSourceInfo: function(channel) {
        var sourceInfo = Utils.$('#source-info');
        var channelName = Utils.$('#current-channel-name');

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

    updateQuickChannels: function() {
        var container = Utils.$('#quick-channel-list');
        if (!container) return;

        var channels = STATE.playlist.filteredChannels.slice(0, CONFIG.UI.MAX_QUICK_CHANNELS);
        Utils.emptyElement(container);
        
        var self = this;
        channels.forEach(function(channel) {
            var btn = Utils.createElement('button', {
                className: 'quick-channel-btn',
                text: Utils.truncate(channel.name, 15),
                title: channel.name,
                onClick: function() { self.playChannel(channel); }
            });
            
            if (channel.logo) {
                var img = Utils.createElement('img', {
                    src: channel.logo,
                    alt: channel.name,
                    style: { width: '20px', height: '20px', borderRadius: '4px' },
                    onerror: function() { this.style.display = 'none'; }
                });
                btn.prepend(img);
            }
            
            container.appendChild(btn);
        });
    },

    /* ==========================================
       EVENT HANDLERS
       ========================================== */

    setupPlayerEvents: function() {
        var player = STATE.player.videoJS;
        if (!player) return;

        player.on('play', function() {
            StateManager.set('player.isPlaying', true);
            StateManager.set('player.isPaused', false);
        });

        player.on('pause', function() {
            StateManager.set('player.isPlaying', false);
            StateManager.set('player.isPaused', true);
        });

        player.on('volumechange', function() {
            StateManager.set('player.volume', player.volume());
            StateManager.set('player.isMuted', player.muted());
        });

        player.on('fullscreenchange', function() {
            StateManager.set('player.isFullscreen', player.isFullscreen());
        });

        player.on('timeupdate', function() {
            STATE.player.currentTime = player.currentTime();
            STATE.player.duration = player.duration();
        });

        player.on('waiting', function() {
            console.log('[PLAYER] Waiting/buffering...');
            this.showLoading();
        }.bind(this));

        player.on('canplay', function() {
            console.log('[PLAYER] Can play - hiding loading');
            this.hideLoading();
        }.bind(this));

        player.on('ended', function() {
            StateManager.set('player.isPlaying', false);
            console.log('[PLAYER] Stream ended');
        });
    },

    setupKeyboardControls: function() {
        var self = this;
        document.addEventListener('keydown', function(event) {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

            var key = event.key.toLowerCase();

            switch (key) {
                case ' ':
                    event.preventDefault();
                    self.togglePlay();
                    break;
                case 'f':
                    if (!event.ctrlKey && !event.metaKey) self.toggleFullscreen();
                    break;
                case 'm':
                    if (!event.ctrlKey && !event.metaKey) self.toggleMute();
                    break;
                case 'p':
                    if (!event.ctrlKey && !event.metaKey) self.togglePiP();
                    break;
                case 'arrowleft':
                    event.preventDefault();
                    self.seekBy(-10);
                    break;
                case 'arrowright':
                    event.preventDefault();
                    self.seekBy(10);
                    break;
                case 'arrowup':
                    event.preventDefault();
                    self.setVolume(STATE.player.volume + 0.1);
                    break;
                case 'arrowdown':
                    event.preventDefault();
                    self.setVolume(STATE.player.volume - 0.1);
                    break;
                case 'escape':
                    if (STATE.player.isFullscreen) self.toggleFullscreen();
                    break;
            }
        });
    },

    setupVisibilityHandling: function() {
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                console.log('[PLAYER] Page hidden');
            } else {
                console.log('[PLAYER] Page visible again');
                var player = STATE.player.videoJS;
                if (player && STATE.player.isPlaying && player.paused()) {
                    player.play().catch(function() {});
                }
            }
        });
    },

    restorePlayerState: function() {
        var preferences = Utils.getFromStorage(CONFIG.STORAGE_KEYS.USER_PREFERENCES);
        if (preferences) {
            if (preferences.volume !== undefined) {
                STATE.player.volume = preferences.volume;
                if (STATE.player.videoJS) STATE.player.videoJS.volume(preferences.volume);
            }
            if (preferences.isMuted !== undefined) {
                STATE.player.isMuted = preferences.isMuted;
                if (STATE.player.videoJS) STATE.player.videoJS.muted(preferences.isMuted);
            }
        }
    },

    /* ==========================================
       CLEANUP
       ========================================== */

    destroy: function() {
        console.log('[PLAYER] Destroying player...');

        if (STATE.timers.retryTimeout) {
            clearTimeout(STATE.timers.retryTimeout);
            STATE.timers.retryTimeout = null;
        }

        if (STATE.player.hls) {
            STATE.player.hls.destroy();
            STATE.player.hls = null;
        }

        if (STATE.player.videoJS) {
            STATE.player.videoJS.dispose();
            STATE.player.videoJS = null;
        }

        var wrapper = Utils.$('.player-wrapper');
        if (wrapper) {
            var iframes = Utils.$$('.embed-iframe', wrapper);
            iframes.forEach(function(iframe) { iframe.remove(); });
        }

        console.log('[PLAYER] Player destroyed');
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlayerModule;
}
