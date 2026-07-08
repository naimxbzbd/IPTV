/*=============================================
  ⚽ XBZ Prime TV - Utility Functions
  Helper Functions, Formatters & Tools
  =============================================*/

'use strict';

const Utils = {
    /* ==========================================
       DOM MANIPULATION
       ========================================== */

    /**
     * Query selector shorthand
     */
    $(selector, parent = document) {
        try {
            return parent.querySelector(selector);
        } catch (error) {
            console.error('[UTILS] Query selector error for "' + selector + '":', error);
            return null;
        }
    },

    /**
     * Query selector all shorthand
     */
    $$(selector, parent = document) {
        try {
            return parent.querySelectorAll(selector);
        } catch (error) {
            console.error('[UTILS] Query selector all error for "' + selector + '":', error);
            return [];
        }
    },

    /**
     * Get element by ID with caching
     */
    getById(id) {
        if (!STATE.dom.elements[id]) {
            STATE.dom.elements[id] = document.getElementById(id);
        }
        return STATE.dom.elements[id];
    },

    /**
     * Create element with attributes and children
     */
    createElement(tag, attributes = {}, children = null) {
        try {
            const element = document.createElement(tag);
            
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'dataset') {
                    Object.entries(value).forEach(([dataKey, dataValue]) => {
                        element.dataset[dataKey] = dataValue;
                    });
                } else if (key === 'style' && typeof value === 'object') {
                    Object.assign(element.style, value);
                } else if (key.startsWith('on') && typeof value === 'function') {
                    element.addEventListener(key.slice(2).toLowerCase(), value);
                } else if (key === 'html') {
                    element.innerHTML = value;
                } else if (key === 'text') {
                    element.textContent = value;
                } else {
                    element.setAttribute(key, value);
                }
            });
            
            if (children !== null && children !== undefined) {
                if (Array.isArray(children)) {
                    children.forEach(child => {
                        Utils.appendElement(element, child);
                    });
                } else {
                    Utils.appendElement(element, children);
                }
            }
            
            return element;
        } catch (error) {
            console.error('[UTILS] Error creating element:', error);
            return document.createElement(tag);
        }
    },

    /**
     * Append child to parent
     */
    appendElement(parent, child) {
        try {
            if (typeof child === 'string') {
                parent.insertAdjacentHTML('beforeend', child);
            } else if (child instanceof Element) {
                parent.appendChild(child);
            } else if (child && child.nodeType === 1) {
                parent.appendChild(child);
            }
        } catch (error) {
            console.error('[UTILS] Error appending element:', error);
        }
    },

    /**
     * Remove all children from an element
     */
    emptyElement(element) {
        try {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        } catch (error) {
            console.error('[UTILS] Error emptying element:', error);
        }
    },

    /**
     * Toggle class on element
     */
    toggleClass(element, className, force) {
        try {
            if (typeof force === 'boolean') {
                element.classList.toggle(className, force);
            } else {
                element.classList.toggle(className);
            }
        } catch (error) {
            console.error('[UTILS] Error toggling class:', error);
        }
    },

    /* ==========================================
       STRING UTILITIES
       ========================================== */

    /**
     * Generate a unique ID
     */
    generateId(prefix = 'xbz') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 9);
        return prefix + '-' + timestamp + '-' + random;
    },

    /**
     * Slugify a string for URLs/IDs
     */
    slugify(text) {
        try {
            return text
                .toString()
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^\w-]+/g, '')
                .replace(/--+/g, '-')
                .replace(/^-+/, '')
                .replace(/-+$/, '');
        } catch (error) {
            console.error('[UTILS] Error slugifying text:', error);
            return text;
        }
    },

    /**
     * Truncate text with ellipsis
     */
    truncate(text, maxLength = 50) {
        try {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength).trim() + '...';
        } catch (error) {
            console.error('[UTILS] Error truncating text:', error);
            return text || '';
        }
    },

    /**
     * Capitalize first letter
     */
    capitalize(text) {
        try {
            if (!text) return '';
            return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        } catch (error) {
            console.error('[UTILS] Error capitalizing:', error);
            return text || '';
        }
    },

    /**
     * Escape HTML entities
     */
    escapeHTML(text) {
        try {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        } catch (error) {
            console.error('[UTILS] Error escaping HTML:', error);
            return text || '';
        }
    },

    /**
     * Strip HTML tags
     */
    stripHTML(html) {
        try {
            const temp = document.createElement('div');
            temp.innerHTML = html;
            return temp.textContent || temp.innerText || '';
        } catch (error) {
            console.error('[UTILS] Error stripping HTML:', error);
            return html || '';
        }
    },

    /* ==========================================
       FORMATTING UTILITIES
       ========================================== */

    /**
     * Format date to relative time
     */
    timeAgo(date) {
        try {
            const now = new Date();
            const past = new Date(date);
            const diffMs = now - past;
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHr = Math.floor(diffMin / 60);
            const diffDay = Math.floor(diffHr / 24);
            
            if (diffSec < 5) return 'just now';
            if (diffSec < 60) return diffSec + 's ago';
            if (diffMin < 60) return diffMin + 'm ago';
            if (diffHr < 24) return diffHr + 'h ago';
            if (diffDay < 7) return diffDay + 'd ago';
            
            return past.toLocaleDateString();
        } catch (error) {
            console.error('[UTILS] Error formatting time ago:', error);
            return '';
        }
    },

    /**
     * Format date for matches
     */
    formatMatchDate(date) {
        try {
            const d = new Date(date);
            const options = {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            };
            return d.toLocaleDateString('en-US', options);
        } catch (error) {
            console.error('[UTILS] Error formatting match date:', error);
            return '';
        }
    },

    /**
     * Format match time only
     */
    formatMatchTime(date) {
        try {
            const d = new Date(date);
            return d.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
        } catch (error) {
            console.error('[UTILS] Error formatting match time:', error);
            return '';
        }
    },

    /**
     * Format number with commas
     */
    formatNumber(num) {
        try {
            return new Intl.NumberFormat('en-US').format(num);
        } catch (error) {
            console.error('[UTILS] Error formatting number:', error);
            return String(num);
        }
    },

    /**
     * Format duration from seconds
     */
    formatDuration(seconds) {
        try {
            if (!seconds || isNaN(seconds)) return '00:00';
            
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            const pad = function(n) { return String(n).padStart(2, '0'); };
            
            if (hrs > 0) {
                return pad(hrs) + ':' + pad(mins) + ':' + pad(secs);
            }
            return pad(mins) + ':' + pad(secs);
        } catch (error) {
            console.error('[UTILS] Error formatting duration:', error);
            return '00:00';
        }
    },

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        try {
            if (bytes === 0) return '0 B';
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
        } catch (error) {
            console.error('[UTILS] Error formatting file size:', error);
            return '0 B';
        }
    },

    /* ==========================================
       URL UTILITIES
       ========================================== */

    /**
     * Check if a string is a valid URL
     */
    isValidURL(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    },

    /**
     * Extract domain from URL
     */
    getDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return url;
        }
    },

    /**
     * Get file extension from URL or filename
     */
    getFileExtension(url) {
        try {
            const cleanUrl = url.split('?')[0].split('#')[0];
            const extension = cleanUrl.split('.').pop();
            return extension ? extension.toLowerCase() : '';
        } catch (error) {
            console.error('[UTILS] Error getting file extension:', error);
            return '';
        }
    },

    /**
     * Check if URL is an HLS stream
     */
    isHLSUrl(url) {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();
        const extension = Utils.getFileExtension(url);
        return extension === 'm3u8' ||
               lowerUrl.includes('.m3u8') ||
               lowerUrl.includes('application/vnd.apple.mpegurl') ||
               lowerUrl.includes('type=m3u8');
    },

    /**
     * Check if URL is a DASH stream
     */
    isDashUrl(url) {
        const extension = Utils.getFileExtension(url);
        return extension === 'mpd';
    },

    /**
     * Check if URL is an iframe embed
     */
    isEmbedCode(content) {
        return /<iframe\s/i.test(content) || /<embed\s/i.test(content);
    },

    /**
     * Extract iframe src from embed code
     */
    extractIframeSrc(html) {
        try {
            const match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
            return match ? match[1] : null;
        } catch (error) {
            console.error('[UTILS] Error extracting iframe src:', error);
            return null;
        }
    },

    /* ==========================================
       STREAM PROCESSING
       ========================================== */

    /**
     * Parse M3U playlist content
     */
    parseM3U(content) {
        try {
            const channels = [];
            const lines = content.split(/\r?\n/);
            let currentChannel = null;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (!line || line.startsWith('#EXTM3U')) continue;
                
                if (line.startsWith('#EXTINF:')) {
                    currentChannel = {
                        id: Utils.generateId('ch'),
                        name: '',
                        url: '',
                        logo: '',
                        group: '',
                        category: 'General',
                        quality: 'SD',
                        attributes: {},
                    };
                    
                    const infoMatch = line.match(/#EXTINF:\s*(-?\d+)\s*(.*)/i);
                    if (infoMatch) {
                        const attrString = infoMatch[2] || '';
                        
                        const nameMatch = attrString.match(/tvg-name="([^"]*)"/i);
                        if (nameMatch) currentChannel.name = nameMatch[1].trim();
                        
                        const logoMatch = attrString.match(/tvg-logo="([^"]*)"/i);
                        if (logoMatch) currentChannel.logo = logoMatch[1].trim();
                        
                        const groupMatch = attrString.match(/group-title="([^"]*)"/i);
                        if (groupMatch) {
                            currentChannel.group = groupMatch[1].trim();
                            currentChannel.category = currentChannel.group;
                        }
                        
                        const idMatch = attrString.match(/tvg-id="([^"]*)"/i);
                        if (idMatch) currentChannel.tvgId = idMatch[1].trim();
                        
                        if (!currentChannel.name) {
                            const commaIndex = attrString.lastIndexOf(',');
                            if (commaIndex !== -1) {
                                currentChannel.name = attrString.substring(commaIndex + 1).trim();
                            } else {
                                currentChannel.name = attrString.trim();
                            }
                        }
                    }
                } else if (currentChannel && !line.startsWith('#')) {
                    if (Utils.isValidURL(line)) {
                        currentChannel.url = line;
                        currentChannel.quality = Utils.detectQuality(currentChannel.name + ' ' + line);
                        currentChannel.isLive = Utils.detectIsLive(currentChannel.name);
                        channels.push({ ...currentChannel });
                    }
                    currentChannel = null;
                }
            }
            
            return Utils.removeDuplicateChannels(channels);
        } catch (error) {
            console.error('[UTILS] Error parsing M3U:', error);
            return [];
        }
    },

    /**
     * Remove duplicate channels from array
     */
    removeDuplicateChannels(channels) {
        try {
            const seen = new Map();
            const unique = [];
            
            channels.forEach(channel => {
                const key = channel.url.toLowerCase();
                if (!seen.has(key)) {
                    seen.set(key, true);
                    unique.push(channel);
                }
            });
            
            return unique;
        } catch (error) {
            console.error('[UTILS] Error removing duplicates:', error);
            return channels;
        }
    },

    /**
     * Detect stream quality from text
     */
    detectQuality(text) {
        try {
            const lower = text.toLowerCase();
            const patterns = CONFIG.CHANNEL.QUALITY_PATTERNS;
            
            for (const [quality, pattern] of Object.entries(patterns)) {
                if (pattern.test(lower)) return quality;
            }
            
            return 'HD';
        } catch (error) {
            console.error('[UTILS] Error detecting quality:', error);
            return 'HD';
        }
    },

    /**
     * Detect if channel is live from name
     */
    detectIsLive(name) {
        try {
            return CONFIG.CHANNEL.STATUS_PATTERNS.LIVE.test(name);
        } catch (error) {
            console.error('[UTILS] Error detecting live status:', error);
            return false;
        }
    },

    /**
     * Extract categories from channels
     */
    extractCategories(channels) {
        try {
            const categories = new Set();
            channels.forEach(channel => {
                const category = Utils.capitalize(channel.category || 'General');
                if (!CONFIG.CHANNEL.IGNORED_CATEGORIES.includes(category.toLowerCase())) {
                    categories.add(category);
                }
            });
            return Array.from(categories).sort();
        } catch (error) {
            console.error('[UTILS] Error extracting categories:', error);
            return ['General'];
        }
    },

    /**
     * Get category emoji
     */
    getCategoryEmoji(category) {
        try {
            const lower = category.toLowerCase();
            const emojis = CONFIG.CHANNEL.CATEGORY_EMOJIS;
            
            for (const [key, emoji] of Object.entries(emojis)) {
                if (lower.includes(key)) return emoji;
            }
            
            return emojis.default;
        } catch (error) {
            console.error('[UTILS] Error getting category emoji:', error);
            return 'TV';
        }
    },

    /* ==========================================
       MATCH UTILITIES
       ========================================== */

    /**
     * Get league emoji
     */
    getLeagueEmoji(league) {
        try {
            const emojis = CONFIG.FOOTBALL.LEAGUE_EMOJIS;
            return emojis[league] || emojis.default;
        } catch (error) {
            console.error('[UTILS] Error getting league emoji:', error);
            return 'INT';
        }
    },

    /**
     * Find matching channel for a match
     */
    findMatchChannel(match, channels) {
        try {
            if (!match || !channels.length) return null;
            
            const keywords = CONFIG.FOOTBALL.CHANNEL_MATCH_KEYWORDS;
            const searchText = (match.competition?.name || '') + ' ' + 
                               (match.homeTeam?.name || '') + ' ' + 
                               (match.awayTeam?.name || '');
            const searchLower = searchText.toLowerCase();
            
            const scored = channels.map(channel => {
                const channelText = (channel.name + ' ' + channel.category + ' ' + (channel.group || '')).toLowerCase();
                let score = 0;
                
                keywords.forEach(keyword => {
                    if (channelText.includes(keyword)) score += 1;
                    if (searchLower.includes(keyword)) score += 1;
                });
                
                return { channel, score };
            });
            
            scored.sort(function(a, b) { return b.score - a.score; });
            
            if (scored.length > 0 && scored[0].score > 0) {
                return scored[0].channel;
            }
            
            return channels.length > 0 ? channels[0] : null;
        } catch (error) {
            console.error('[UTILS] Error finding match channel:', error);
            return null;
        }
    },

    /* ==========================================
       DEBOUNCE & THROTTLE
       ========================================== */

    /**
     * Debounce function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = function() {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     */
    throttle(func, limit = 100) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
        };
    },

    /* ==========================================
       STORAGE UTILITIES
       ========================================== */

    /**
     * Safe localStorage get with expiry check
     */
    getFromStorage(key, maxAge = null) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            
            const parsed = JSON.parse(item);
            
            if (maxAge && parsed._timestamp) {
                const age = Date.now() - parsed._timestamp;
                if (age > maxAge) {
                    localStorage.removeItem(key);
                    return null;
                }
            }
            
            return parsed._data !== undefined ? parsed._data : parsed;
        } catch (error) {
            console.error('[UTILS] Error reading from storage "' + key + '":', error);
            return null;
        }
    },

    /**
     * Safe localStorage set with timestamp
     */
    setToStorage(key, data) {
        try {
            const wrapped = {
                _data: data,
                _timestamp: Date.now(),
            };
            localStorage.setItem(key, JSON.stringify(wrapped));
        } catch (error) {
            console.error('[UTILS] Error writing to storage "' + key + '":', error);
            if (error.name === 'QuotaExceededError') {
                Utils.clearOldStorage();
                try {
                    localStorage.setItem(key, JSON.stringify({ _data: data, _timestamp: Date.now() }));
                } catch (e) {
                    console.error('[UTILS] Storage still full after cleanup');
                }
            }
        }
    },

    /**
     * Clear old/expired storage items
     */
    clearOldStorage() {
        try {
            const keys = Object.values(CONFIG.STORAGE_KEYS);
            const allKeys = Object.keys(localStorage);
            
            allKeys.forEach(key => {
                if (!keys.includes(key) && key.startsWith('xbz_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('[UTILS] Error clearing storage:', error);
        }
    },

    /**
     * Remove item from storage
     */
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('[UTILS] Error removing from storage "' + key + '":', error);
        }
    },

    /* ==========================================
       FETCH UTILITIES
       ========================================== */

    /**
     * Fetch with timeout, retry and CORS proxy support
     */
    async fetchWithTimeout(url, options = {}, timeout = 15000, retries = 2) {
        const controller = new AbortController();
        const timeoutId = setTimeout(function() { controller.abort(); }, timeout);
        
        const fetchOptions = {
            ...options,
            signal: controller.signal,
            mode: 'cors',
            credentials: 'omit',
        };

        let fetchUrl = url;
        if (CONFIG.CORS_PROXY && !CONFIG.IS_LOCAL) {
            if (url.includes('raw.githubusercontent.com') || 
                url.includes('api.football-data.org')) {
                fetchUrl = CONFIG.CORS_PROXY + encodeURIComponent(url);
                console.log('[UTILS] Using CORS proxy for:', url.substring(0, 50) + '...');
            }
        }
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(fetchUrl, fetchOptions);
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (fetchUrl !== url && attempt === 0) {
                    console.log('[UTILS] Proxy failed, trying direct URL...');
                    fetchUrl = url;
                    attempt--;
                    continue;
                }
                
                if (attempt === retries) {
                    throw error;
                }
                
                const delay = CONFIG.RETRY_DELAYS[attempt] || 2000;
                await Utils.sleep(delay);
                console.log('[UTILS] Retry attempt ' + (attempt + 1) + '/' + retries + ' for ' + url.substring(0, 50) + '...');
            }
        }
    },

    /**
     * Fetch JSON from URL
     */
    async fetchJSON(url, options = {}) {
        try {
            const response = await Utils.fetchWithTimeout(url, options);
            return await response.json();
        } catch (error) {
            console.error('[UTILS] Error fetching JSON from "' + url + '":', error);
            throw error;
        }
    },

    /**
     * Fetch text from URL
     */
    async fetchText(url, options = {}) {
        try {
            const response = await Utils.fetchWithTimeout(url, options);
            return await response.text();
        } catch (error) {
            console.error('[UTILS] Error fetching text from "' + url + '":', error);
            throw error;
        }
    },

    /* ==========================================
       ASYNC UTILITIES
       ========================================== */

    /**
     * Sleep/delay promise
     */
    sleep(ms) {
        return new Promise(function(resolve) { return setTimeout(resolve, ms); });
    },

    /**
     * Retry async function with exponential backoff
     */
    async retryWithBackoff(fn, maxRetries = 3, delays = null) {
        const retryDelays = delays || CONFIG.RETRY_DELAYS;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxRetries) throw error;
                const delay = retryDelays[attempt] || 2000;
                console.log('[UTILS] Retry ' + (attempt + 1) + '/' + maxRetries + ' after ' + delay + 'ms');
                await Utils.sleep(delay);
            }
        }
    },

    /* ==========================================
       EVENT UTILITIES
       ========================================== */

    /**
     * Trigger custom event
     */
    triggerEvent(element, eventName, detail = {}) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true,
        });
        element.dispatchEvent(event);
    },

    /* ==========================================
       DEVICE & BROWSER UTILITIES
       ========================================== */

    /**
     * Check if device is mobile
     */
    isMobile() {
        return window.innerWidth < CONFIG.BREAKPOINTS.LG;
    },

    /**
     * Check if device is tablet
     */
    isTablet() {
        return window.innerWidth >= CONFIG.BREAKPOINTS.MD && window.innerWidth < CONFIG.BREAKPOINTS.LG;
    },

    /**
     * Check if device is touch-enabled
     */
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },

    /* ==========================================
       MISC UTILITIES
       ========================================== */

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch (error) {
            console.error('[UTILS] Error copying to clipboard:', error);
            return false;
        }
    },

    /**
     * Get random item from array
     */
    getRandomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    /**
     * Shuffle array (Fisher-Yates)
     */
    shuffleArray(arr) {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }
        return shuffled;
    },

    /**
     * Safe JSON parse
     */
    safeJSONParse(json, fallback = null) {
        try {
            return JSON.parse(json);
        } catch (error) {
            console.error('[UTILS] JSON parse error:', error);
            return fallback;
        }
    },

    /**
     * Check if value is empty
     */
    isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
    },

    /**
     * Deep clone an object
     */
    deepClone(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (error) {
            console.error('[UTILS] Error deep cloning:', error);
            return obj;
        }
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
