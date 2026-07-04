/*=============================================
  ⚽ XBZ Prime TV - Theme Manager
  Dark/Light Mode Toggle & System Preference
  =============================================*/

'use strict';

const ThemeManager = {
    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize theme manager
     */
    init() {
        console.log('[THEME] Initializing theme manager...');

        try {
            // Detect system preference
            this.detectSystemPreference();

            // Load saved theme or use system preference
            const savedTheme = this.getSavedTheme();
            const theme = savedTheme || STATE.theme.systemPreference || 'dark';

            // Apply theme
            this.applyTheme(theme);

            // Set up listeners
            this.setupSystemPreferenceListener();
            this.setupToggleButton();

            console.log(`[THEME] Theme initialized: ${theme}`);
        } catch (error) {
            console.error('[THEME] Initialization error:', error);
            // Fallback to dark theme
            this.applyTheme('dark');
        }
    },

    /* ==========================================
       THEME APPLICATION
       ========================================== */

    /**
     * Apply a theme to the document
     * @param {string} theme - 'dark' or 'light'
     */
    applyTheme(theme) {
        try {
            if (theme !== 'dark' && theme !== 'light') {
                console.warn(`[THEME] Invalid theme: ${theme}, defaulting to dark`);
                theme = 'dark';
            }

            // Set data attribute on html element
            document.documentElement.setAttribute('data-theme', theme);

            // Update color scheme meta tag
            this.updateColorSchemeMeta(theme);

            // Update state
            StateManager.set('theme.current', theme);

            // Save to localStorage
            this.saveTheme(theme);

            // Update toggle button icon
            this.updateToggleIcon(theme);

            // Dispatch theme change event
            Utils.triggerEvent(document.body, 'theme:changed', { theme });

            console.log(`[THEME] Applied theme: ${theme}`);
        } catch (error) {
            console.error('[THEME] Error applying theme:', error);
        }
    },

    /**
     * Toggle between dark and light themes
     */
    toggleTheme() {
        try {
            const currentTheme = STATE.theme.current;
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.applyTheme(newTheme);
            
            // Add animation class for smooth transition
            document.documentElement.classList.add('theme-transitioning');
            setTimeout(() => {
                document.documentElement.classList.remove('theme-transitioning');
            }, 500);
            
            return newTheme;
        } catch (error) {
            console.error('[THEME] Error toggling theme:', error);
            return STATE.theme.current;
        }
    },

    /**
     * Set theme explicitly
     * @param {string} theme - 'dark' or 'light'
     */
    setTheme(theme) {
        if (theme === 'dark' || theme === 'light') {
            this.applyTheme(theme);
        }
    },

    /* ==========================================
       SYSTEM PREFERENCE
       ========================================== */

    /**
     * Detect system color scheme preference
     */
    detectSystemPreference() {
        try {
            if (window.matchMedia) {
                const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
                const lightQuery = window.matchMedia('(prefers-color-scheme: light)');

                if (darkQuery.matches) {
                    STATE.theme.systemPreference = 'dark';
                } else if (lightQuery.matches) {
                    STATE.theme.systemPreference = 'light';
                }
                
                console.log(`[THEME] System preference: ${STATE.theme.systemPreference || 'none'}`);
            }
        } catch (error) {
            console.error('[THEME] Error detecting system preference:', error);
        }
    },

    /**
     * Listen for system preference changes
     */
    setupSystemPreferenceListener() {
        try {
            if (!window.matchMedia) return;

            const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            const listener = (event) => {
                const newPreference = event.matches ? 'dark' : 'light';
                console.log(`[THEME] System preference changed: ${newPreference}`);
                
                STATE.theme.systemPreference = newPreference;
                
                // Only auto-switch if user hasn't manually set a theme
                const savedTheme = this.getSavedTheme();
                if (!savedTheme) {
                    this.applyTheme(newPreference);
                }
            };

            // Modern browsers
            if (darkQuery.addEventListener) {
                darkQuery.addEventListener('change', listener);
            }
            // Legacy support
            else if (darkQuery.addListener) {
                darkQuery.addListener(listener);
            }

            console.log('[THEME] System preference listener set up');
        } catch (error) {
            console.error('[THEME] Error setting up preference listener:', error);
        }
    },

    /* ==========================================
       TOGGLE BUTTON
       ========================================== */

    /**
     * Set up theme toggle button
     */
    setupToggleButton() {
        try {
            const toggleBtn = Utils.$('#theme-toggle');
            if (!toggleBtn) {
                console.warn('[THEME] Theme toggle button not found');
                return;
            }

            toggleBtn.addEventListener('click', () => {
                this.toggleTheme();
            });

            // Update icon based on current theme
            this.updateToggleIcon(STATE.theme.current);

            console.log('[THEME] Toggle button set up');
        } catch (error) {
            console.error('[THEME] Error setting up toggle button:', error);
        }
    },

    /**
     * Update toggle button icon
     * @param {string} theme - Current theme
     */
    updateToggleIcon(theme) {
        try {
            const toggleBtn = Utils.$('#theme-toggle');
            if (!toggleBtn) return;

            const icon = Utils.$('i', toggleBtn);
            if (icon) {
                if (theme === 'dark') {
                    icon.className = 'fas fa-sun';
                    toggleBtn.setAttribute('title', 'Switch to Light Mode');
                    toggleBtn.setAttribute('aria-label', 'Switch to Light Mode');
                } else {
                    icon.className = 'fas fa-moon';
                    toggleBtn.setAttribute('title', 'Switch to Dark Mode');
                    toggleBtn.setAttribute('aria-label', 'Switch to Dark Mode');
                }
            }
        } catch (error) {
            console.error('[THEME] Error updating toggle icon:', error);
        }
    },

    /* ==========================================
       META TAGS
       ========================================== */

    /**
     * Update theme-color meta tag
     * @param {string} theme - Current theme
     */
    updateColorSchemeMeta(theme) {
        try {
            // Update theme-color meta tag
            const metaThemeColor = Utils.$('meta[name="theme-color"]');
            if (metaThemeColor) {
                const color = theme === 'dark' ? '#0a0e27' : '#f5f6fa';
                metaThemeColor.setAttribute('content', color);
            }

            // Update apple-mobile-web-app-status-bar-style
            const appleStatusBar = Utils.$('meta[name="apple-mobile-web-app-status-bar-style"]');
            if (appleStatusBar) {
                const style = theme === 'dark' ? 'black-translucent' : 'default';
                appleStatusBar.setAttribute('content', style);
            }

            // Update color-scheme
            document.documentElement.style.colorScheme = theme;
        } catch (error) {
            console.error('[THEME] Error updating meta tags:', error);
        }
    },

    /* ==========================================
       PERSISTENCE
       ========================================== */

    /**
     * Save theme to localStorage
     * @param {string} theme - Theme to save
     */
    saveTheme(theme) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
        } catch (error) {
            console.error('[THEME] Error saving theme:', error);
        }
    },

    /**
     * Get saved theme from localStorage
     * @returns {string|null} Saved theme or null
     */
    getSavedTheme() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
            if (saved === 'dark' || saved === 'light') {
                return saved;
            }
            return null;
        } catch (error) {
            console.error('[THEME] Error getting saved theme:', error);
            return null;
        }
    },

    /**
     * Clear saved theme (revert to system preference)
     */
    clearSavedTheme() {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.THEME);
            const systemTheme = STATE.theme.systemPreference || 'dark';
            this.applyTheme(systemTheme);
            console.log('[THEME] Cleared saved theme, using system preference');
        } catch (error) {
            console.error('[THEME] Error clearing saved theme:', error);
        }
    },

    /* ==========================================
       THEME UTILITIES
       ========================================== */

    /**
     * Check if current theme is dark
     * @returns {boolean}
     */
    isDarkMode() {
        return STATE.theme.current === 'dark';
    },

    /**
     * Check if current theme is light
     * @returns {boolean}
     */
    isLightMode() {
        return STATE.theme.current === 'light';
    },

    /**
     * Get current theme name
     * @returns {string}
     */
    getCurrentTheme() {
        return STATE.theme.current;
    },

    /**
     * Get opposite theme name
     * @returns {string}
     */
    getOppositeTheme() {
        return STATE.theme.current === 'dark' ? 'light' : 'dark';
    },

    /* ==========================================
       THEME-AWARE STYLES
       ========================================== */

    /**
     * Get a CSS variable value for current theme
     * @param {string} variableName - CSS variable name (with --)
     * @returns {string} Computed value
     */
    getCSSVariable(variableName) {
        try {
            const styles = getComputedStyle(document.documentElement);
            return styles.getPropertyValue(variableName).trim();
        } catch (error) {
            console.error('[THEME] Error getting CSS variable:', error);
            return '';
        }
    },

    /**
     * Get appropriate color for current theme
     * @param {string} darkColor - Color for dark theme
     * @param {string} lightColor - Color for light theme
     * @returns {string} Appropriate color
     */
    getThemeColor(darkColor, lightColor) {
        return this.isDarkMode() ? darkColor : lightColor;
    },

    /**
     * Get chart/visualization colors for current theme
     * @returns {Object} Color palette
     */
    getChartColors() {
        if (this.isDarkMode()) {
            return {
                primary: '#e63946',
                secondary: '#00b4d8',
                success: '#2ecc71',
                warning: '#f39c12',
                error: '#e74c3c',
                background: '#1a1f3a',
                text: '#f0f0f5',
                grid: '#2a3155',
            };
        } else {
            return {
                primary: '#e63946',
                secondary: '#00b4d8',
                success: '#27ae60',
                warning: '#d68910',
                error: '#c0392b',
                background: '#ffffff',
                text: '#1a1f3a',
                grid: '#d1d5e0',
            };
        }
    },

    /* ==========================================
       ANIMATIONS
       ========================================== */

    /**
     * Add smooth theme transition
     */
    addTransitionStyles() {
        try {
            const styleId = 'theme-transition-styles';
            
            // Remove existing transition styles
            const existing = document.getElementById(styleId);
            if (existing) existing.remove();

            // Create new style element
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .theme-transitioning,
                .theme-transitioning *,
                .theme-transitioning *::before,
                .theme-transitioning *::after {
                    transition: background-color 0.3s ease,
                                color 0.3s ease,
                                border-color 0.3s ease,
                                box-shadow 0.3s ease,
                                fill 0.3s ease,
                                stroke 0.3s ease !important;
                }
            `;

            document.head.appendChild(style);

            // Remove after transition completes
            setTimeout(() => {
                const el = document.getElementById(styleId);
                if (el) el.remove();
            }, 600);
        } catch (error) {
            console.error('[THEME] Error adding transition styles:', error);
        }
    },

    /* ==========================================
       KEYBOARD SHORTCUT
       ========================================== */

    /**
     * Set up keyboard shortcut for theme toggle
     */
    setupKeyboardShortcut() {
        try {
            document.addEventListener('keydown', (event) => {
                // Ctrl+Shift+T to toggle theme
                if (event.ctrlKey && event.shiftKey && event.key === 'T') {
                    event.preventDefault();
                    this.toggleTheme();
                }
            });
        } catch (error) {
            console.error('[THEME] Error setting up keyboard shortcut:', error);
        }
    },

    /* ==========================================
       THEME SCHEDULING (Optional Feature)
       ========================================== */

    /**
     * Set up automatic theme switching based on time
     * @param {string} darkStart - Dark theme start time (HH:MM)
     * @param {string} lightStart - Light theme start time (HH:MM)
     */
    scheduleThemeByTime(darkStart = '18:00', lightStart = '06:00') {
        try {
            // Clear existing schedule
            this.clearSchedule();

            const checkTime = () => {
                const now = new Date();
                const hours = now.getHours();
                const minutes = now.getMinutes();
                const currentTime = hours * 60 + minutes;

                const [darkH, darkM] = darkStart.split(':').map(Number);
                const [lightH, lightM] = lightStart.split(':').map(Number);

                const darkTime = darkH * 60 + darkM;
                const lightTime = lightH * 60 + lightM;

                const savedTheme = this.getSavedTheme();
                
                // Only auto-switch if user hasn't manually set a theme
                if (!savedTheme) {
                    if (currentTime >= darkTime || currentTime < lightTime) {
                        if (STATE.theme.current !== 'dark') {
                            this.applyTheme('dark');
                        }
                    } else {
                        if (STATE.theme.current !== 'light') {
                            this.applyTheme('light');
                        }
                    }
                }
            };

            // Check immediately
            checkTime();

            // Check every minute
            STATE.timers.themeSchedule = setInterval(checkTime, 60000);

            console.log(`[THEME] Scheduled theme: Dark from ${darkStart}, Light from ${lightStart}`);
        } catch (error) {
            console.error('[THEME] Error scheduling theme:', error);
        }
    },

    /**
     * Clear theme schedule
     */
    clearSchedule() {
        if (STATE.timers.themeSchedule) {
            clearInterval(STATE.timers.themeSchedule);
            STATE.timers.themeSchedule = null;
        }
    },

    /* ==========================================
       THEME STATUS
       ========================================== */

    /**
     * Get theme status information
     * @returns {Object} Theme status
     */
    getStatus() {
        return {
            current: STATE.theme.current,
            systemPreference: STATE.theme.systemPreference,
            isDark: this.isDarkMode(),
            isLight: this.isLightMode(),
            isSaved: !!this.getSavedTheme(),
            isSystemDefault: !this.getSavedTheme(),
        };
    },

    /* ==========================================
       CLEANUP
       ========================================== */

    /**
     * Clean up theme manager
     */
    destroy() {
        this.clearSchedule();
        console.log('[THEME] Theme manager destroyed');
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
