/*=============================================
  XBZ Prime TV - Configuration
  App Constants, Settings & API Config
  =============================================*/

'use strict';

const CONFIG = {
    APP_NAME: 'XBZ Prime TV',
    APP_VERSION: '2.0.0',
    APP_AUTHOR: 'Naim Xbz',
    APP_YEAR: 2026,
    APP_DESCRIPTION: 'Premium Sports Live Streaming Platform',
    APP_KEYWORDS: 'live sports, football streaming, cricket live, sports TV, XBZ Prime TV',

    IS_NETLIFY: window.location.hostname.includes('netlify.app'),
    IS_LOCAL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    
    CORS_PROXY: '',
    
    GITHUB_PLAYLIST_URLS: [
        'https://raw.githubusercontent.com/naimxbzbd/XBZ-Prime-TV/refs/heads/main/playlist.m3u',
        'https://raw.githubusercontent.com/sanjoykb/-KB-TV-Playlist/refs/heads/main/Github%20Auto%20Update%20Channel.m3u'
    ],

    GITHUB_BREAKING_NEWS_URL: 'https://raw.githubusercontent.com/naimxbzbd/XBZ-Prime-TV/main/data/breaking.json',

    FOOTBALL_API_BASE_URL: 'https://api.football-data.org/v4',
    FOOTBALL_API_KEY: '1343f48af11546bd8be28141f72e8739',
    FOOTBALL_API_MATCHES_ENDPOINT: '/matches',

    TELEGRAM_URL: 'https://t.me/naimxbz',
    GITHUB_URL: 'https://github.com/naimxbzbd',
    CONTACT_EMAIL: 'contact@xbzprime.tv',

    CACHE_PLAYLIST: 30 * 60 * 1000,
    CACHE_BREAKING_NEWS: 60 * 1000,
    CACHE_FOOTBALL_MATCHES: 10 * 1000,
    CACHE_THEME: 24 * 60 * 60 * 1000,

    REFRESH_PLAYLIST: 30 * 60 * 1000,
    REFRESH_BREAKING_NEWS: 60 * 1000,
    REFRESH_FOOTBALL_MATCHES: 10 * 1000,
    REFRESH_SCORE_TICKER: 40 * 1000,

    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAYS: [2000, 4000, 8000],

    PLAYER: {
        CONTROLS: true,
        AUTOPLAY: true,
        MUTED: true,
        PRELOAD: 'auto',
        PLAYSINLINE: true,
        LOOP: false,
        FLUID: true,
        ASPECT_RATIO: '16:9',
        LIVEUI: true,
        HLS_OPTIONS: {
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
            highBufferWatchdogPeriod: 2,
            nudgeOffset: 0.1,
            nudgeMaxRetry: 3,
            maxFragLookUpTolerance: 0.25,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            liveDurationInfinity: true,
            enableCEA708Captions: true,
            stretchShortVideoTrack: false,
            forceKeyFrameOnDiscontinuity: true,
            abrEwmaFastLive: 3,
            abrEwmaSlowLive: 9,
            abrEwmaFastVoD: 3,
            abrEwmaSlowVoD: 9,
            abrEwmaDefaultEstimate: 500000,
            abrBandWidthFactor: 0.95,
            abrBandWidthUpFactor: 0.7,
            abrMaxWithRealBitrate: true,
            maxStarvationDelay: 4,
            startLevel: -1,
            debug: false,
            fragLoadingTimeOut: 20000,
            manifestLoadingTimeOut: 10000,
            levelLoadingTimeOut: 10000
        },
        SUPPORTED_EXTENSIONS: ['m3u8', 'mp4', 'ts', 'mpd', 'webm', 'ogg'],
        WATERMARK_TEXT: 'XBZ Live TV',
        WATERMARK_OPACITY: 0.15,
    },

    UI: {
        CHANNELS_GRID_DESKTOP: 4,
        CHANNELS_GRID_TABLET: 2,
        CHANNELS_GRID_MOBILE: 1,
        TOAST_DURATION_SUCCESS: 3000,
        TOAST_DURATION_ERROR: 5000,
        TOAST_DURATION_INFO: 4000,
        TOAST_DURATION_WARNING: 4500,
        TOAST_DURATION_LOADING: 0,
        SEARCH_DEBOUNCE: 300,
        SCROLL_THROTTLE: 100,
        INTERSECTION_THRESHOLD: 0.1,
        SIDEBAR_WIDTH: 280,
        SIDEBAR_BREAKPOINT: 992,
        MAX_QUICK_CHANNELS: 8,
        MARQUEE_DUPLICATE_COUNT: 3,
    },

    CHANNEL: {
        CATEGORY_EMOJIS: {
            'sports': 'S',
            'sport': 'S',
            'football': 'F',
            'cricket': 'C',
            'news': 'N',
            'entertainment': 'E',
            'music': 'M',
            'movies': 'MV',
            'kids': 'K',
            'religious': 'R',
            'education': 'ED',
            'documentary': 'DOC',
            'general': 'GEN',
            'default': 'TV'
        },
        QUALITY_PATTERNS: {
            '4K': /\b(4k|uhd|2160p|ultra\s*hd)\b/i,
            'HD': /\b(hd|720p|1080p|high\s*def|fhd)\b/i,
            'SD': /\b(sd|480p|576p|standard)\b/i,
            'LOW': /\b(360p|240p|low)\b/i
        },
        STATUS_PATTERNS: {
            'LIVE': /\b(live|24\/7|24x7)\b/i,
            'ONLINE': /\b(online|active|working)\b/i
        },
        IGNORED_CATEGORIES: ['undefined', 'other', 'unknown'],
    },

    FOOTBALL: {
        COMPETITIONS: ['PL', 'CL', 'BL1', 'SA', 'PD', 'FL1', 'ELC', 'EC', 'WC', 'PPL', 'DED', 'BSA'],
        STATUSES: ['LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED', 'SCHEDULED', 'TIMED', 'POSTPONED', 'CANCELLED', 'SUSPENDED'],
        CHANNEL_MATCH_KEYWORDS: [
            'sports', 'sport', 'football', 'soccer', 'premier', 'league',
            'champions', 'laliga', 'serie a', 'bundesliga', 'ligue 1',
            'espn', 'sky sports', 'bt sport', 'beIN', 'super sport',
            'star sports', 'sony', 'dazn', 'match', 'live'
        ],
        LEAGUE_EMOJIS: {
            'Premier League': 'ENG',
            'Champions League': 'UCL',
            'Bundesliga': 'GER',
            'Serie A': 'ITA',
            'La Liga': 'ESP',
            'Ligue 1': 'FRA',
            'Championship': 'CHA',
            'European Championship': 'EUR',
            'World Cup': 'WC',
            'Primeira Liga': 'POR',
            'Eredivisie': 'NED',
            'Brasileirao': 'BRA',
            'default': 'INT'
        },
        DAYS_AHEAD: 3,
        DAYS_BEHIND: 1,
    },

    PWA: {
        CACHE_NAME: 'xbz-prime-tv-v2',
        CACHE_URLS: [
            '/', '/index.html', '/manifest.json',
            '/assets/logo.svg', '/assets/favicon.png', '/assets/placeholder.webp',
            '/css/variables.css', '/css/reset.css', '/css/layout.css',
            '/css/components.css', '/css/animations.css', '/css/responsive.css',
            '/js/config.js', '/js/state.js', '/js/utils.js',
            '/js/api/github.js', '/js/api/football.js', '/js/api/breaking.js',
            '/js/player/player.js',
            '/js/ui/theme.js', '/js/ui/toast.js', '/js/ui/header.js',
            '/js/ui/sidebar.js', '/js/ui/ticker.js', '/js/ui/matches.js',
            '/js/ui/channels.js', '/js/ui/modal.js', '/js/app.js'
        ],
        OFFLINE_PAGE: '/index.html',
        INSTALL_PROMPT_DELAY: 30000,
    },

    STORAGE_KEYS: {
        THEME: 'xbz_theme',
        PLAYLIST: 'xbz_playlist',
        PLAYLIST_TIMESTAMP: 'xbz_playlist_ts',
        BREAKING_NEWS: 'xbz_breaking_news',
        BREAKING_NEWS_TIMESTAMP: 'xbz_breaking_news_ts',
        FOOTBALL_MATCHES: 'xbz_football_matches',
        FOOTBALL_MATCHES_TIMESTAMP: 'xbz_football_matches_ts',
        LAST_CHANNEL: 'xbz_last_channel',
        LAST_SOURCE: 'xbz_last_source',
        FAVORITE_CHANNELS: 'xbz_favorites',
        USER_PREFERENCES: 'xbz_preferences',
        INSTALL_PROMPT_SHOWN: 'xbz_install_prompt_shown',
    },

    KEYBOARD_SHORTCUTS: {
        'ctrl+r': 'refreshPlaylist',
        'ctrl+f': 'focusSearch',
        'escape': 'closeAll',
        'f': 'toggleFullscreen',
        'm': 'toggleMute',
        'p': 'togglePiP',
        'space': 'togglePlayPause',
        'arrowleft': 'seekBackward',
        'arrowright': 'seekForward',
        'arrowup': 'volumeUp',
        'arrowdown': 'volumeDown',
    },

    DEBUG: {
        ENABLED: true,
        LOG_LEVEL: 'debug',
        LOG_PREFIX: '[XBZ]',
        SHOW_PERFORMANCE_MARKS: false,
    },

    BREAKPOINTS: {
        XS: 375,
        SM: 576,
        MD: 768,
        LG: 992,
        XL: 1200,
        XXL: 1400,
    },

    MIME_TYPES: {
        M3U: ['application/x-mpegurl', 'application/vnd.apple.mpegurl', 'audio/mpegurl', 'audio/x-mpegurl'],
        HLS: ['application/vnd.apple.mpegurl', 'application/x-mpegurl'],
        MP4: ['video/mp4'],
        MPD: ['application/dash+xml'],
        TS: ['video/mp2t'],
    },
};

// Set CORS proxy for production
if (CONFIG.IS_NETLIFY || (!CONFIG.IS_LOCAL && window.location.protocol === 'https:')) {
    CONFIG.CORS_PROXY = 'https://api.allorigins.win/raw?url=';
    console.log('[CONFIG] Production mode - Using CORS proxy');
} else {
    CONFIG.CORS_PROXY = '';
    console.log('[CONFIG] Local mode - Direct fetch');
}

// Freeze all config objects
Object.freeze(CONFIG);
Object.freeze(CONFIG.PLAYER);
Object.freeze(CONFIG.PLAYER.HLS_OPTIONS);
Object.freeze(CONFIG.UI);
Object.freeze(CONFIG.CHANNEL);
Object.freeze(CONFIG.FOOTBALL);
Object.freeze(CONFIG.PWA);
Object.freeze(CONFIG.STORAGE_KEYS);
Object.freeze(CONFIG.KEYBOARD_SHORTCUTS);
Object.freeze(CONFIG.DEBUG);
Object.freeze(CONFIG.BREAKPOINTS);
Object.freeze(CONFIG.MIME_TYPES);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
