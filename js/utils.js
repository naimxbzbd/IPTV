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
     * @param {string} selector - CSS selector
     * @param {Element} parent - Parent element (default: document)
     * @returns {Element|null}
     */
    $(selector, parent = document) {
        try {
            return parent.querySelector(selector);
        } catch (error) {
            console.error(`[UTILS] Query selector error for "${selector}":`, error);
            return null;
        }
    },

    /**
     * Query selector all shorthand
     * @param {string} selector - CSS selector
     * @param {Element} parent - Parent element (default: document)
     * @returns {NodeList}
     */
    $$(selector, parent = document) {
        try {
            return parent.querySelectorAll(selector);
        } catch (error) {
            console.error(`[UTILS] Query selector all error for "${selector}":`, error);
            return document.createDocumentFragment().childNodes;
        }
    },

    /**
     * Get element by ID with caching
     * @param {string} id - Element ID
     * @returns {Element|null}
     */
    getById(id) {
        if (!STATE.dom.elements[id]) {
            STATE.dom.elements[id] = document.getElementById(id);
        }
        return STATE.dom.elements[id];
    },

    /**
     * Create element with attributes and children
     * @param {string} tag - HTML tag
     * @param {Object} attributes - Element attributes
     * @param {string|Element|Array} children - Child content
     * @returns {Element}
     */
    createElement(tag, attributes = {}, children = null) {
        try {
            const element = document.createElement(tag);
            
            // Set attributes
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
            
            // Append children
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
     * Append child to parent (handles strings, elements)
     * @param {Element} parent - Parent element
     * @param {string|Element} child - Child to append
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
     * @param {Element} element - Parent element
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
     * @param {Element} element - Target element
     * @param {string} className - Class to toggle
     * @param {boolean} force - Force add/remove
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
     * @param {string} prefix - Optional prefix
     * @returns {string} Unique ID
     */
    generateId(prefix = 'xbz') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 9);
        return `${prefix}-${timestamp}-${random}`;
    },

    /**
     * Slugify a string for URLs/IDs
     * @param {string} text - Input text
     * @returns {string} Slugified text
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
     * @param {string} text - Input text
     * @param {number} maxLength - Max length
     * @returns {string} Truncated text
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
     * @param {string} text - Input text
     * @returns {string} Capitalized text
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
     * @param {string} text - Input text
     * @returns {string} Escaped text
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
     * @param {string} html - HTML string
     * @returns {string} Plain text
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
     * @param {Date|string} date - Date to format
     * @returns {string} Relative time string
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
            if (diffSec < 60) return `${diffSec}s ago`;
            if (diffMin < 60) return `${diffMin}m ago`;
            if (diffHr < 24) return `${diffHr}h ago`;
            if (diffDay < 7) return `${diffDay}d ago`;
            
            return past.toLocaleDateString();
        } catch (error) {
            console.error('[UTILS] Error formatting time ago:', error);
            return '';
        }
    },

    /**
     * Format date for matches
     * @param {Date|string} date - Match date
     * @returns {string} Formatted date
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
     * @param {Date|string} date - Match date
     * @returns {string} Time string
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
     * @param {number} num - Number to format
     * @returns {string} Formatted number
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
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration (mm:ss or hh:mm:ss)
     */
    formatDuration(seconds) {
        try {
            if (!seconds || isNaN(seconds)) return '00:00';
            
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            const pad = (n) => String(n).padStart(2, '0');
            
            if (hrs > 0) {
                return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
            }
            return `${pad(mins)}:${pad(secs)}`;
        } catch (error) {
            console.error('[UTILS] Error formatting duration:', error);
            return '00:00';
        }
    },

    /**
     * Format file size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size
     */
    formatFileSize(bytes) {
        try {
            if (bytes === 0) return '0 B';
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
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
     * @param {string} url - URL to validate
     * @returns {boolean}
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
     * @param {string} url - Full URL
     * @returns {string} Domain name
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
     * @param {string} url - URL or filename
     * @returns {string} File extension (lowercase)
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
     * @param {string} url - Stream URL
     * @returns {boolean}
     */
    isHLSUrl(url) {
        const extension = Utils.getFileExtension(url);
        return extension === 'm3u8';
    },

    /**
     * Check if URL is a DASH stream
     * @param {string} url - Stream URL
     * @returns {boolean}
     */
    isDashUrl(url) {
        const extension = Utils.getFileExtension(url);
        return extension === 'mpd';
    },

    /**
     * Check if URL is an iframe embed
     * @param {string} content - URL or HTML
     * @returns {boolean}
     */
    isEmbedCode(content) {
        return /<iframe\s/i.test(content) || /<embed\s/i.test(content);
    },

    /**
     * Extract iframe src from embed code
     * @param {string} html - Embed HTML
     * @returns {string|null} Iframe src URL
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
     * @param {string} content - M3U file content
     * @returns {Array} Array of channel objects
     */
    parseM3U(content) {
        try {
            const channels = [];
            const lines = content.split(/\r?\n/);
            let currentChannel = null;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Skip empty lines and comments
                if (!line || line.startsWith('#EXTM3U')) continue;
                
                // Parse EXTINF line
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
                    
                    // Extract duration and attributes
                    const infoMatch = line.match(/#EXTINF:\s*(-?\d+)\s*(.*)/i);
                    if (infoMatch) {
                        const attrString = infoMatch[2] || '';
                        
                        // Extract tvg-name
                        const nameMatch = attrString.match(/tvg-name="([^"]*)"/i);
                        if (nameMatch) {
                            currentChannel.name = nameMatch[1].trim();
                        }
                        
                        // Extract tvg-logo
                        const logoMatch = attrString.match(/tvg-logo="([^"]*)"/i);
                        if (logoMatch) {
                            currentChannel.logo = logoMatch[1].trim();
                        }
                        
                        // Extract group-title
                        const groupMatch = attrString.match(/group-title="([^"]*)"/i);
                        if (groupMatch) {
                            currentChannel.group = groupMatch[1].trim();
                            currentChannel.category = currentChannel.group;
                        }
                        
                        // Extract tvg-id
                        const idMatch = attrString.match(/tvg-id="([^"]*)"/i);
                        if (idMatch) {
                            currentChannel.tvgId = idMatch[1].trim();
                        }
                        
                        // If no name from tvg-name, use the rest after comma
                        if (!currentChannel.name) {
                            const commaIndex = attrString.lastIndexOf(',');
                            if (commaIndex !== -1) {
                                currentChannel.name = attrString.substring(commaIndex + 1).trim();
                            } else {
                                currentChannel.name = attrString.trim();
                            }
                        }
                    }
                }
                // Parse URL line
                else if (currentChannel && !line.startsWith('#')) {
                    if (Utils.isValidURL(line)) {
                        currentChannel.url = line;
                        
                        // Detect quality from URL or name
                        currentChannel.quality = Utils.detectQuality(currentChannel.name + ' ' + line);
                        
                        // Detect if it's live
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
     * @param {Array} channels - Channel array
     * @returns {Array} Deduplicated channels
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
     * @param {string} text - Text to analyze
     * @returns {string} Quality label
     */
    detectQuality(text) {
        try {
            const lower = text.toLowerCase();
            const patterns = CONFIG.CHANNEL.QUALITY_PATTERNS;
            
            for (const [quality, pattern] of Object.entries(patterns)) {
                if (pattern.test(lower)) return quality;
            }
            
            return 'HD'; // Default
        } catch (error) {
            console.error('[UTILS] Error detecting quality:', error);
            return 'HD';
        }
    },

    /**
     * Detect if channel is live from name
     * @param {string} name - Channel name
     * @returns {boolean}
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
     * @param {Array} channels - Channel array
     * @returns {Array} Unique categories
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
     * @param {string} category - Category name
     * @returns {string} Emoji
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
            return '📺';
        }
    },

    /* ==========================================
       MATCH UTILITIES
       ========================================== */

    /**
     * Get league emoji
     * @param {string} league - League name
     * @returns {string} Emoji
     */
    getLeagueEmoji(league) {
        try {
            const emojis = CONFIG.FOOTBALL.LEAGUE_EMOJIS;
            return emojis[league] || emojis.default;
        } catch (error) {
            console.error('[UTILS] Error getting league emoji:', error);
            return '⚽';
        }
    },

    /**
     * Find matching channel for a match
     * @param {Object} match - Match object
     * @param {Array} channels - Available channels
     * @returns {Object|null} Matching channel
     */
    findMatchChannel(match, channels) {
        try {
            if (!match || !channels.length) return null;
            
            const keywords = CONFIG.FOOTBALL.CHANNEL_MATCH_KEYWORDS;
            const searchText = `${match.competition?.name || ''} ${match.homeTeam?.name || ''} ${match.awayTeam?.name || ''}`.toLowerCase();
            
            // Score each channel based on keyword matches
            const scored = channels.map(channel => {
                const channelText = `${channel.name} ${channel.category} ${channel.group || ''}`.toLowerCase();
                let score = 0;
                
                keywords.forEach(keyword => {
                    if (channelText.includes(keyword)) score += 1;
                    if (searchText.includes(keyword)) score += 1;
                });
                
                return { channel, score };
            });
            
            // Sort by score descending
            scored.sort((a, b) => b.score - a.score);
            
            // Return best match if score > 0, otherwise first channel
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
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit in ms
     * @returns {Function} Throttled function
     */
    throttle(func, limit = 100) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => {
                    inThrottle = false;
                }, limit);
            }
        };
    },

    /**
     * RAF throttle for animations
     * @param {Function} func - Function to throttle
     * @returns {Function} RAF-throttled function
     */
    rafThrottle(func) {
        let rafId = null;
        return function executedFunction(...args) {
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                func(...args);
                rafId = null;
            });
        };
    },

    /* ==========================================
       STORAGE UTILITIES
       ========================================== */

    /**
     * Safe localStorage get with expiry check
     * @param {string} key - Storage key
     * @param {number} maxAge - Max age in ms
     * @returns {*} Stored value or null
     */
    getFromStorage(key, maxAge = null) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            
            const parsed = JSON.parse(item);
            
            // Check expiry if maxAge specified
            if (maxAge && parsed._timestamp) {
                const age = Date.now() - parsed._timestamp;
                if (age > maxAge) {
                    localStorage.removeItem(key);
                    return null;
                }
            }
            
            return parsed._data !== undefined ? parsed._data : parsed;
        } catch (error) {
            console.error(`[UTILS] Error reading from storage "${key}":`, error);
            return null;
        }
    },

    /**
     * Safe localStorage set with timestamp
     * @param {string} key - Storage key
     * @param {*} data - Data to store
     */
    setToStorage(key, data) {
        try {
            const wrapped = {
                _data: data,
                _timestamp: Date.now(),
            };
            localStorage.setItem(key, JSON.stringify(wrapped));
        } catch (error) {
            console.error(`[UTILS] Error writing to storage "${key}":`, error);
            // If quota exceeded, clear old items
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
     * @param {string} key - Storage key
     */
    removeFromStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`[UTILS] Error removing from storage "${key}":`, error);
        }
    },

    /* ==========================================
       FETCH UTILITIES
       ========================================== */

    /**
     * Fetch with timeout and retry
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @param {number} timeout - Timeout in ms
     * @param {number} retries - Number of retries
     * @returns {Promise<Response>}
     */
    async fetchWithTimeout(url, options = {}, timeout = 10000, retries = 2) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const fetchOptions = {
            ...options,
            signal: controller.signal,
        };
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, fetchOptions);
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (attempt === retries) {
                    throw error;
                }
                
                // Wait before retry
                const delay = CONFIG.RETRY_DELAYS[attempt] || 2000;
                await Utils.sleep(delay);
                
                console.log(`[UTILS] Retry attempt ${attempt + 1}/${retries} for ${url}`);
            }
        }
    },

    /**
     * Fetch JSON from URL
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>}
     */
    async fetchJSON(url, options = {}) {
        try {
            const response = await Utils.fetchWithTimeout(url, options);
            return await response.json();
        } catch (error) {
            console.error(`[UTILS] Error fetching JSON from "${url}":`, error);
            throw error;
        }
    },

    /**
     * Fetch text from URL
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise<string>}
     */
    async fetchText(url, options = {}) {
        try {
            const response = await Utils.fetchWithTimeout(url, options);
            return await response.text();
        } catch (error) {
            console.error(`[UTILS] Error fetching text from "${url}":`, error);
            throw error;
        }
    },

    /* ==========================================
       ASYNC UTILITIES
       ========================================== */

    /**
     * Sleep/delay promise
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Retry async function with exponential backoff
     * @param {Function} fn - Async function to retry
     * @param {number} maxRetries - Max retry attempts
     * @param {Array} delays - Array of delay times
     * @returns {Promise}
     */
    async retryWithBackoff(fn, maxRetries = 3, delays = null) {
        const retryDelays = delays || CONFIG.RETRY_DELAYS;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxRetries) throw error;
                const delay = retryDelays[attempt] || 2000;
                console.log(`[UTILS] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
                await Utils.sleep(delay);
            }
        }
    },

    /**
     * Run promises with concurrency limit
     * @param {Array<Function>} tasks - Array of async functions
     * @param {number} concurrency - Max concurrent
     * @returns {Promise<Array>}
     */
    async runWithConcurrency(tasks, concurrency = 3) {
        const results = [];
        const executing = new Set();
        
        for (const task of tasks) {
            const promise = task().then(result => {
                executing.delete(promise);
                return result;
            });
            
            executing.add(promise);
            results.push(promise);
            
            if (executing.size >= concurrency) {
                await Promise.race(executing);
            }
        }
        
        return Promise.all(results);
    },

    /* ==========================================
       EVENT UTILITIES
       ========================================== */

    /**
     * Add event listener with cleanup tracking
     * @param {Element} element - Target element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     * @returns {Function} Remove listener function
     */
    addEventListener(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        return () => element.removeEventListener(event, handler, options);
    },

    /**
     * Delegate event to parent
     * @param {Element} parent - Parent element
     * @param {string} eventType - Event type
     * @param {string} selector - Child selector
     * @param {Function} handler - Event handler
     */
    delegateEvent(parent, eventType, selector, handler) {
        parent.addEventListener(eventType, (event) => {
            const target = event.target.closest(selector);
            if (target && parent.contains(target)) {
                handler.call(target, event, target);
            }
        });
    },

    /**
     * Trigger custom event
     * @param {Element} element - Target element
     * @param {string} eventName - Event name
     * @param {*} detail - Event detail
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
     * Get current breakpoint
     * @returns {string} Breakpoint name
     */
    getBreakpoint() {
        const width = window.innerWidth;
        if (width < CONFIG.BREAKPOINTS.SM) return 'xs';
        if (width < CONFIG.BREAKPOINTS.MD) return 'sm';
        if (width < CONFIG.BREAKPOINTS.LG) return 'md';
        if (width < CONFIG.BREAKPOINTS.XL) return 'lg';
        if (width < CONFIG.BREAKPOINTS.XXL) return 'xl';
        return 'xxl';
    },

    /**
     * Check if device is mobile
     * @returns {boolean}
     */
    isMobile() {
        return window.innerWidth < CONFIG.BREAKPOINTS.LG;
    },

    /**
     * Check if device is tablet
     * @returns {boolean}
     */
    isTablet() {
        return window.innerWidth >= CONFIG.BREAKPOINTS.MD && window.innerWidth < CONFIG.BREAKPOINTS.LG;
    },

    /**
     * Check if device is touch-enabled
     * @returns {boolean}
     */
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },

    /**
     * Check if browser supports HLS natively
     * @returns {boolean}
     */
    supportsNativeHLS() {
        const video = document.createElement('video');
        return video.canPlayType('application/vnd.apple.mpegurl') !== '';
    },

    /**
     * Check if browser supports MSE
     * @returns {boolean}
     */
    supportsMSE() {
        return 'MediaSource' in window && !!window.MediaSource;
    },

    /* ==========================================
       LOGGING UTILITIES
       ========================================== */

    /**
     * Conditional debug logging
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {*} data - Optional data
     */
    log(level, message, data = null) {
        if (!CONFIG.DEBUG.ENABLED) return;
        
        const prefix = CONFIG.DEBUG.LOG_PREFIX;
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        const configLevel = levels[CONFIG.DEBUG.LOG_LEVEL] || 1;
        const msgLevel = levels[level] || 1;
        
        if (msgLevel >= configLevel) {
            const logFn = console[level] || console.log;
            if (data) {
                logFn(`${prefix} ${message}`, data);
            } else {
                logFn(`${prefix} ${message}`);
            }
        }
    },

    /* ==========================================
       MISC UTILITIES
       ========================================== */

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            
            // Fallback
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
     * @param {Array} arr - Input array
     * @returns {*} Random item
     */
    getRandomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    /**
     * Shuffle array (Fisher-Yates)
     * @param {Array} arr - Input array
     * @returns {Array} Shuffled array
     */
    shuffleArray(arr) {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },

    /**
     * Group array by key
     * @param {Array} arr - Input array
     * @param {string} key - Group by this key
     * @returns {Object} Grouped object
     */
    groupBy(arr, key) {
        return arr.reduce((groups, item) => {
            const value = item[key] || 'unknown';
            if (!groups[value]) groups[value] = [];
            groups[value].push(item);
            return groups;
        }, {});
    },

    /**
     * Chunk array into smaller arrays
     * @param {Array} arr - Input array
     * @param {number} size - Chunk size
     * @returns {Array<Array>}
     */
    chunkArray(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    },

    /**
     * Measure performance of a function
     * @param {string} label - Performance label
     * @param {Function} fn - Function to measure
     * @returns {*} Function result
     */
    measurePerformance(label, fn) {
        if (!CONFIG.DEBUG.SHOW_PERFORMANCE_MARKS) return fn();
        
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
        return result;
    },

    /**
     * Safe JSON parse
     * @param {string} json - JSON string
     * @param {*} fallback - Fallback value
     * @returns {*}
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
     * @param {*} value - Value to check
     * @returns {boolean}
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
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
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
