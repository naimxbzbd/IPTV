/*=============================================
  ⚽ XBZ Prime TV - Toast Notification System
  Success, Error, Info & Warning Toasts
  =============================================*/

'use strict';

const ToastManager = {
    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize toast system
     */
    init() {
        console.log('[TOAST] Initializing toast notification system...');

        try {
            // Ensure toast container exists
            this.ensureContainer();

            // Set up online/offline listeners
            this.setupConnectivityListeners();

            console.log('[TOAST] Toast system initialized');
        } catch (error) {
            console.error('[TOAST] Initialization error:', error);
        }
    },

    /**
     * Ensure toast container exists in DOM
     */
    ensureContainer() {
        let container = Utils.$('#toast-container');
        
        if (!container) {
            container = Utils.createElement('div', {
                id: 'toast-container',
                className: 'toast-container',
                'aria-live': 'polite',
                'aria-atomic': 'true',
            });
            document.body.appendChild(container);
        }

        return container;
    },

    /* ==========================================
       TOAST CREATION
       ========================================== */

    /**
     * Show a success toast
     * @param {string} message - Toast message
     * @param {string} title - Optional title
     * @param {number} duration - Duration in ms
     * @returns {string} Toast ID
     */
    success(message, title = 'Success', duration = null) {
        return this.show({
            type: 'success',
            title,
            message,
            duration: duration || CONFIG.UI.TOAST_DURATION_SUCCESS,
        });
    },

    /**
     * Show an error toast
     * @param {string} message - Toast message
     * @param {string} title - Optional title
     * @param {number} duration - Duration in ms
     * @returns {string} Toast ID
     */
    error(message, title = 'Error', duration = null) {
        return this.show({
            type: 'error',
            title,
            message,
            duration: duration || CONFIG.UI.TOAST_DURATION_ERROR,
        });
    },

    /**
     * Show an info toast
     * @param {string} message - Toast message
     * @param {string} title - Optional title
     * @param {number} duration - Duration in ms
     * @returns {string} Toast ID
     */
    info(message, title = 'Info', duration = null) {
        return this.show({
            type: 'info',
            title,
            message,
            duration: duration || CONFIG.UI.TOAST_DURATION_INFO,
        });
    },

    /**
     * Show a warning toast
     * @param {string} message - Toast message
     * @param {string} title - Optional title
     * @param {number} duration - Duration in ms
     * @returns {string} Toast ID
     */
    warning(message, title = 'Warning', duration = null) {
        return this.show({
            type: 'warning',
            title,
            message,
            duration: duration || CONFIG.UI.TOAST_DURATION_WARNING,
        });
    },

    /**
     * Show a loading toast (persistent)
     * @param {string} message - Toast message
     * @param {string} title - Optional title
     * @returns {string} Toast ID
     */
    loading(message, title = 'Loading') {
        return this.show({
            type: 'loading',
            title,
            message,
            duration: 0, // Persistent
        });
    },

    /* ==========================================
       CORE SHOW/HIDE LOGIC
       ========================================== */

    /**
     * Show a toast notification
     * @param {Object} options - Toast options
     * @returns {string} Toast ID
     */
    show(options = {}) {
        try {
            const {
                type = 'info',
                title = '',
                message = '',
                duration = 3000,
                closable = true,
            } = options;

            // Generate unique ID
            const id = Utils.generateId('toast');

            // Get or create container
            const container = this.ensureContainer();

            // Limit max toasts
            if (STATE.ui.activeToasts.length >= STATE.ui.maxToasts) {
                this.dismiss(STATE.ui.activeToasts[0]);
            }

            // Create toast element
            const toast = this.createToastElement(id, type, title, message, closable);

            // Add to container
            container.appendChild(toast);

            // Track active toast
            STATE.ui.activeToasts.push(id);

            // Auto-dismiss after duration
            if (duration > 0) {
                const timeoutId = setTimeout(() => {
                    this.dismiss(id);
                }, duration);
                
                STATE.timers.toastTimeouts.push(timeoutId);
            }

            // Trigger animation
            requestAnimationFrame(() => {
                toast.classList.add('visible');
            });

            console.log(`[TOAST] ${type}: ${message}`);

            return id;

        } catch (error) {
            console.error('[TOAST] Error showing toast:', error);
            return null;
        }
    },

    /**
     * Create toast DOM element
     * @param {string} id - Toast ID
     * @param {string} type - Toast type
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {boolean} closable - Show close button
     * @returns {Element} Toast element
     */
    createToastElement(id, type, title, message, closable) {
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
            loading: 'fa-spinner fa-spin',
        };

        const colorMap = {
            success: 'var(--color-success)',
            error: 'var(--color-error)',
            warning: 'var(--color-warning)',
            info: 'var(--color-info)',
            loading: 'var(--color-accent)',
        };

        const icon = iconMap[type] || iconMap.info;
        const color = colorMap[type] || colorMap.info;

        const toast = Utils.createElement('div', {
            id,
            className: `toast toast-${type}`,
            dataset: { toastId: id, toastType: type },
            role: 'alert',
            'aria-live': 'assertive',
        });

        // Icon
        const iconEl = Utils.createElement('div', {
            className: 'toast-icon',
            style: { color },
        });
        iconEl.innerHTML = `<i class="fas ${icon}"></i>`;

        // Content
        const content = Utils.createElement('div', {
            className: 'toast-content',
        });

        if (title) {
            const titleEl = Utils.createElement('div', {
                className: 'toast-title',
                text: title,
            });
            content.appendChild(titleEl);
        }

        const messageEl = Utils.createElement('div', {
            className: 'toast-message',
            text: message,
        });
        content.appendChild(messageEl);

        // Close button
        const closeBtn = null;
        if (closable) {
            const closeEl = Utils.createElement('button', {
                className: 'toast-close',
                'aria-label': 'Close notification',
                onClick: () => this.dismiss(id),
            });
            closeEl.innerHTML = '<i class="fas fa-times"></i>';
            toast.appendChild(iconEl);
            toast.appendChild(content);
            toast.appendChild(closeEl);
        } else {
            toast.appendChild(iconEl);
            toast.appendChild(content);
        }

        return toast;
    },

    /**
     * Dismiss a specific toast
     * @param {string} id - Toast ID to dismiss
     */
    dismiss(id) {
        try {
            const toast = document.getElementById(id);
            if (!toast) return;

            // Add removing class for animation
            toast.classList.add('removing');

            // Remove after animation
            const handleTransitionEnd = () => {
                toast.removeEventListener('transitionend', handleTransitionEnd);
                
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }

                // Remove from active list
                const index = STATE.ui.activeToasts.indexOf(id);
                if (index > -1) {
                    STATE.ui.activeToasts.splice(index, 1);
                }
            };

            toast.addEventListener('transitionend', handleTransitionEnd);

            // Fallback removal
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                const idx = STATE.ui.activeToasts.indexOf(id);
                if (idx > -1) {
                    STATE.ui.activeToasts.splice(idx, 1);
                }
            }, 400);

        } catch (error) {
            console.error('[TOAST] Error dismissing toast:', error);
        }
    },

    /**
     * Dismiss a loading toast by ID
     * @param {string} id - Toast ID
     */
    dismissLoading(id) {
        this.dismiss(id);
    },

    /* ==========================================
       BULK OPERATIONS
       ========================================== */

    /**
     * Dismiss all active toasts
     */
    dismissAll() {
        const toasts = [...STATE.ui.activeToasts];
        toasts.forEach(id => this.dismiss(id));
        
        // Clear all timeouts
        STATE.timers.toastTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        STATE.timers.toastTimeouts = [];
        
        console.log('[TOAST] All toasts dismissed');
    },

    /**
     * Dismiss toasts by type
     * @param {string} type - Toast type to dismiss
     */
    dismissByType(type) {
        const toasts = STATE.ui.activeToasts.filter(id => {
            const toast = document.getElementById(id);
            return toast && toast.dataset.toastType === type;
        });
        
        toasts.forEach(id => this.dismiss(id));
    },

    /* ==========================================
       SPECIAL TOASTS
       ========================================== */

    /**
     * Show welcome toast
     */
    showWelcome() {
        const hour = new Date().getHours();
        let greeting = 'Good Evening';
        if (hour < 12) greeting = 'Good Morning';
        else if (hour < 17) greeting = 'Good Afternoon';

        this.success(
            `Welcome to XBZ Prime TV! Select a channel to start watching live sports.`,
            `${greeting}! ⚽`
        );
    },

    /**
     * Show online status toast
     */
    showOnline() {
        this.success('You are back online! Content will refresh automatically.', 'Connected');
    },

    /**
     * Show offline status toast
     */
    showOffline() {
        this.warning('You are offline. Cached content will be shown.', 'No Connection');
    },

    /**
     * Show playlist loaded toast
     * @param {number} count - Number of channels
     */
    showPlaylistLoaded(count) {
        this.success(`${Utils.formatNumber(count)} channels loaded successfully.`, 'Channels Ready');
    },

    /**
     * Show match loaded toast
     * @param {number} count - Number of matches
     */
    showMatchesLoaded(count) {
        const liveCount = FootballAPI ? FootballAPI.getLiveMatches().length : 0;
        const message = liveCount > 0
            ? `${count} matches loaded (${liveCount} live now)`
            : `${count} matches loaded`;
        this.info(message, 'Matches Updated');
    },

    /**
     * Show stream started toast
     * @param {string} channelName - Channel name
     */
    showStreamStarted(channelName) {
        this.info(`Now playing: ${channelName}`, 'Stream Started');
    },

    /**
     * Show stream error toast
     * @param {string} errorMessage - Error message
     */
    showStreamError(errorMessage) {
        this.error(errorMessage || 'Failed to play stream. Trying next source...', 'Stream Error');
    },

    /**
     * Show retry toast
     * @param {number} attempt - Retry attempt number
     * @param {number} maxRetries - Max retries
     */
    showRetry(attempt, maxRetries) {
        this.warning(`Retrying... (Attempt ${attempt}/${maxRetries})`, 'Stream Recovery');
    },

    /**
     * Show source switched toast
     * @param {string} sourceLabel - New source label
     */
    showSourceSwitched(sourceLabel) {
        this.info(`Switched to ${sourceLabel}`, 'Source Changed');
    },

    /**
     * Show install prompt toast
     */
    showInstallPrompt() {
        this.info(
            'Install XBZ Prime TV on your device for quick access!',
            'Install App'
        );
    },

    /**
     * Show update available toast
     */
    showUpdateAvailable() {
        this.info(
            'A new version is available. Refresh to update.',
            'Update Available'
        );
    },

    /* ==========================================
       CONNECTIVITY LISTENERS
       ========================================== */

    /**
     * Set up online/offline event listeners
     */
    setupConnectivityListeners() {
        window.addEventListener('online', () => {
            this.showOnline();
        });

        window.addEventListener('offline', () => {
            this.showOffline();
        });
    },

    /* ==========================================
       CUSTOM TOASTS
       ========================================== */

    /**
     * Show a custom toast with action button
     * @param {Object} options - Custom toast options
     */
    custom(options = {}) {
        const {
            type = 'info',
            title = '',
            message = '',
            actionText = '',
            actionCallback = null,
            duration = 5000,
        } = options;

        try {
            const id = Utils.generateId('toast');
            const container = this.ensureContainer();

            const toast = this.createToastElement(id, type, title, message, true);

            // Add action button if specified
            if (actionText && actionCallback) {
                const actionBtn = Utils.createElement('button', {
                    className: 'btn btn-sm btn-outline toast-action-btn',
                    text: actionText,
                    style: {
                        marginTop: '8px',
                        padding: '4px 12px',
                        fontSize: '11px',
                    },
                    onClick: () => {
                        actionCallback();
                        this.dismiss(id);
                    },
                });
                
                const content = Utils.$('.toast-content', toast);
                if (content) {
                    content.appendChild(actionBtn);
                }
            }

            container.appendChild(toast);
            STATE.ui.activeToasts.push(id);

            if (duration > 0) {
                const timeoutId = setTimeout(() => this.dismiss(id), duration);
                STATE.timers.toastTimeouts.push(timeoutId);
            }

            requestAnimationFrame(() => {
                toast.classList.add('visible');
            });

            return id;
        } catch (error) {
            console.error('[TOAST] Error showing custom toast:', error);
            return null;
        }
    },

    /* ==========================================
       TOAST STATUS
       ========================================== */

    /**
     * Check if any toasts are active
     * @returns {boolean}
     */
    hasActiveToasts() {
        return STATE.ui.activeToasts.length > 0;
    },

    /**
     * Get count of active toasts
     * @returns {number}
     */
    getActiveCount() {
        return STATE.ui.activeToasts.length;
    },

    /**
     * Get all active toast IDs
     * @returns {Array}
     */
    getActiveIds() {
        return [...STATE.ui.activeToasts];
    },

    /* ==========================================
       CLEANUP
       ========================================== */

    /**
     * Clean up toast system
     */
    destroy() {
        this.dismissAll();
        console.log('[TOAST] Toast system destroyed');
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToastManager;
}
