/*=============================================
  ⚽ XBZ Prime TV - Sidebar Component
  Category Navigation & Channel Filtering
  =============================================*/

'use strict';

const SidebarComponent = {
    /* ==========================================
       DOM ELEMENTS
       ========================================== */

    elements: {
        sidebar: null,
        overlay: null,
        closeBtn: null,
        categoryList: null,
        channelCount: null,
    },

    /* ==========================================
       INITIALIZATION
       ========================================== */

    /**
     * Initialize sidebar component
     */
    init() {
        console.log('[SIDEBAR] Initializing sidebar component...');

        try {
            // Cache DOM elements
            this.cacheElements();

            // Set up event listeners
            this.setupEventListeners();

            // Set up state listeners
            this.setupStateListeners();

            // Initial render
            this.renderCategories();

            console.log('[SIDEBAR] Sidebar component initialized');
        } catch (error) {
            console.error('[SIDEBAR] Initialization error:', error);
        }
    },

    /**
     * Cache sidebar DOM elements
     */
    cacheElements() {
        this.elements.sidebar = Utils.$('#sidebar');
        this.elements.overlay = Utils.$('#sidebar-overlay');
        this.elements.closeBtn = Utils.$('#sidebar-close');
        this.elements.categoryList = Utils.$('#category-list');
        this.elements.channelCount = Utils.$('#channel-count');
    },

    /* ==========================================
       EVENT LISTENERS
       ========================================== */

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Close button
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener('click', () => {
                this.close();
            });
        }

        // Overlay click to close
        if (this.elements.overlay) {
            this.elements.overlay.addEventListener('click', () => {
                this.close();
            });
        }

        // Category click delegation
        if (this.elements.categoryList) {
            this.elements.categoryList.addEventListener('click', (event) => {
                const categoryItem = event.target.closest('.category-item');
                if (categoryItem) {
                    const category = categoryItem.dataset.category;
                    if (category) {
                        this.selectCategory(category);
                        
                        // Close sidebar on mobile
                        if (Utils.isMobile()) {
                            this.close();
                        }
                    }
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Escape to close
            if (event.key === 'Escape' && STATE.ui.sidebarOpen) {
                this.close();
            }
        });

        // Handle window resize
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 200));

        // Swipe to close on mobile
        this.setupSwipeGesture();
    },

    /**
     * Set up state change listeners
     */
    setupStateListeners() {
        // Listen for sidebar state changes
        document.body.addEventListener('statechange', (event) => {
            if (event.detail?.path === 'ui.sidebarOpen') {
                if (event.detail.newValue) {
                    this.open();
                } else {
                    this.close();
                }
            }
        });

        // Listen for playlist updates
        document.body.addEventListener('playlist:loaded', () => {
            this.renderCategories();
            this.updateChannelCount();
        });

        // Listen for category filter changes
        document.body.addEventListener('statechange', (event) => {
            if (event.detail?.path === 'playlist.selectedCategory') {
                this.updateActiveCategory(event.detail.newValue);
            }
            if (event.detail?.path === 'playlist.filteredCount') {
                this.updateChannelCount();
            }
        });
    },

    /**
     * Set up swipe gesture for mobile
     */
    setupSwipeGesture() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;

        if (this.elements.sidebar) {
            this.elements.sidebar.addEventListener('touchstart', (event) => {
                touchStartX = event.changedTouches[0].screenX;
                touchStartY = event.changedTouches[0].screenY;
            }, { passive: true });

            this.elements.sidebar.addEventListener('touchend', (event) => {
                touchEndX = event.changedTouches[0].screenX;
                const touchEndY = event.changedTouches[0].screenY;

                const diffX = touchStartX - touchEndX;
                const diffY = Math.abs(touchStartY - touchEndY);

                // Only trigger if horizontal swipe is dominant
                if (diffX > 60 && diffX > diffY) {
                    this.close();
                }
            });
        }
    },

    /* ==========================================
       OPEN / CLOSE
       ========================================== */

    /**
     * Open sidebar
     */
    open() {
        if (!this.elements.sidebar || !this.elements.overlay) return;

        this.elements.sidebar.classList.add('open');
        this.elements.overlay.classList.remove('hidden');
        
        StateManager.set('ui.sidebarOpen', true);
        
        // Prevent body scroll on mobile
        if (Utils.isMobile()) {
            document.body.style.overflow = 'hidden';
        }

        console.log('[SIDEBAR] Sidebar opened');
    },

    /**
     * Close sidebar
     */
    close() {
        if (!this.elements.sidebar || !this.elements.overlay) return;

        this.elements.sidebar.classList.remove('open');
        this.elements.overlay.classList.add('hidden');
        
        StateManager.set('ui.sidebarOpen', false);
        
        // Restore body scroll
        document.body.style.overflow = '';

        console.log('[SIDEBAR] Sidebar closed');
    },

    /**
     * Toggle sidebar
     */
    toggle() {
        if (STATE.ui.sidebarOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    /**
     * Handle window resize
     */
    handleResize() {
        // Auto-close sidebar on desktop if it was open on mobile
        if (!Utils.isMobile() && STATE.ui.sidebarOpen) {
            // On desktop, sidebar can stay open as overlay
            // or close depending on design preference
        }
    },

    /* ==========================================
       CATEGORY RENDERING
       ========================================== */

    /**
     * Render category list
     */
    renderCategories() {
        if (!this.elements.categoryList) return;

        try {
            const categories = STATE.playlist.categories;
            
            // Clear existing items
            Utils.emptyElement(this.elements.categoryList);

            // Add "All" category
            const allItem = this.createCategoryItem('all', 'All Channels', 'fa-globe', STATE.playlist.totalCount);
            this.elements.categoryList.appendChild(allItem);

            // Add category items
            if (categories.length === 0) {
                // Show skeleton or empty state
                const skeletonItem = Utils.createElement('li', {
                    className: 'category-item skeleton',
                });
                skeletonItem.innerHTML = '<span class="skeleton-text medium"></span>';
                this.elements.categoryList.appendChild(skeletonItem);
            } else {
                categories.forEach(category => {
                    const count = STATE.playlist.channels.filter(
                        ch => ch.category.toLowerCase() === category.toLowerCase()
                    ).length;
                    
                    const emoji = Utils.getCategoryEmoji(category);
                    const item = this.createCategoryItem(
                        category.toLowerCase(),
                        category,
                        emoji,
                        count
                    );
                    
                    this.elements.categoryList.appendChild(item);
                });
            }

            // Update active state
            this.updateActiveCategory(STATE.playlist.selectedCategory);

            console.log(`[SIDEBAR] Rendered ${categories.length + 1} categories`);
        } catch (error) {
            console.error('[SIDEBAR] Error rendering categories:', error);
        }
    },

    /**
     * Create a category list item
     * @param {string} value - Category value
     * @param {string} label - Display label
     * @param {string} icon - Icon class or emoji
     * @param {number} count - Channel count
     * @returns {Element} Category item element
     */
    createCategoryItem(value, label, icon, count) {
        const isEmoji = icon.length <= 4 && !icon.includes('fa-');
        
        const item = Utils.createElement('li', {
            className: 'category-item',
            dataset: { category: value },
            title: `${label} (${count} channels)`,
        });

        // Icon
        const iconSpan = Utils.createElement('span', {
            className: 'category-icon',
        });
        
        if (isEmoji) {
            iconSpan.textContent = icon;
        } else {
            iconSpan.innerHTML = `<i class="fas ${icon}"></i>`;
        }

        // Label
        const labelSpan = Utils.createElement('span', {
            className: 'category-label',
            text: label,
        });

        // Count badge
        const countSpan = Utils.createElement('span', {
            className: 'category-count',
            text: Utils.formatNumber(count),
        });

        item.appendChild(iconSpan);
        item.appendChild(labelSpan);
        item.appendChild(countSpan);

        return item;
    },

    /* ==========================================
       CATEGORY SELECTION
       ========================================== */

    /**
     * Select a category filter
     * @param {string} category - Category to select
     */
    selectCategory(category) {
        try {
            console.log(`[SIDEBAR] Category selected: ${category}`);

            // Update state
            StateManager.set('playlist.selectedCategory', category);

            // Update category filter dropdown
            this.syncCategoryFilter(category);

            // Update active state in sidebar
            this.updateActiveCategory(category);

            // Scroll to channels section
            const channelsSection = Utils.$('#channels-section');
            if (channelsSection) {
                setTimeout(() => {
                    channelsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }

            // Show toast
            if (category !== 'all') {
                const count = STATE.playlist.filteredCount;
                ToastManager.info(
                    `${Utils.formatNumber(count)} channels in ${Utils.capitalize(category)}`,
                    'Category Filtered'
                );
            }
        } catch (error) {
            console.error('[SIDEBAR] Error selecting category:', error);
        }
    },

    /**
     * Update active category in sidebar
     * @param {string} category - Active category
     */
    updateActiveCategory(category) {
        if (!this.elements.categoryList) return;

        const items = Utils.$$('.category-item', this.elements.categoryList);
        items.forEach(item => {
            if (item.dataset.category === category) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    /**
     * Sync sidebar selection with category filter dropdown
     * @param {string} category - Selected category
     */
    syncCategoryFilter(category) {
        const filterSelect = Utils.$('#category-filter');
        if (filterSelect) {
            filterSelect.value = category;
        }
    },

    /* ==========================================
       CHANNEL COUNT
       ========================================== */

    /**
     * Update channel count display
     */
    updateChannelCount() {
        if (!this.elements.channelCount) return;

        const total = STATE.playlist.totalCount;
        const filtered = STATE.playlist.filteredCount;
        
        if (STATE.playlist.selectedCategory === 'all') {
            this.elements.channelCount.textContent = Utils.formatNumber(total);
        } else {
            this.elements.channelCount.textContent = `${Utils.formatNumber(filtered)} / ${Utils.formatNumber(total)}`;
        }
    },

    /* ==========================================
       SIDEBAR STATUS
       ========================================== */

    /**
     * Check if sidebar is open
     * @returns {boolean}
     */
    isOpen() {
        return STATE.ui.sidebarOpen;
    },

    /**
     * Get sidebar width
     * @returns {number} Width in pixels
     */
    getWidth() {
        return this.elements.sidebar ? this.elements.sidebar.offsetWidth : CONFIG.UI.SIDEBAR_WIDTH;
    },

    /* ==========================================
       CLEANUP
       ========================================== */

    /**
     * Clean up sidebar component
     */
    destroy() {
        this.close();
        console.log('[SIDEBAR] Sidebar component destroyed');
    },
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarComponent;
}
