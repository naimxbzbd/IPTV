/*=============================================
  ⚽ XBZ Prime TV - Service Worker
  Offline Cache, Background Sync & Updates
  =============================================*/

'use strict';

/* ==========================================
   CACHE CONFIGURATION
   ========================================== */

const CACHE_NAME = 'xbz-prime-tv-v2';
const RUNTIME_CACHE = 'xbz-prime-tv-runtime-v2';
const API_CACHE = 'xbz-prime-tv-api-v2';

const PRECACHE_URLS = [
    '/XBZ-Prime-TV/',
    '/XBZ-Prime-TV/index.html',
    '/XBZ-Prime-TV/manifest.json',
    '/XBZ-Prime-TV/assets/logo.svg',
    '/XBZ-Prime-TV/assets/favicon.png',
    '/XBZ-Prime-TV/assets/placeholder.webp',
    '/XBZ-Prime-TV/css/variables.css',
    '/XBZ-Prime-TV/css/reset.css',
    '/XBZ-Prime-TV/css/layout.css',
    '/XBZ-Prime-TV/css/components.css',
    '/XBZ-Prime-TV/css/animations.css',
    '/XBZ-Prime-TV/css/responsive.css',
    '/XBZ-Prime-TV/js/config.js',
    '/XBZ-Prime-TV/js/state.js',
    '/XBZ-Prime-TV/js/utils.js',
    '/XBZ-Prime-TV/js/api/github.js',
    '/XBZ-Prime-TV/js/api/football.js',
    '/XBZ-Prime-TV/js/api/breaking.js',
    '/XBZ-Prime-TV/js/player/player.js',
    '/XBZ-Prime-TV/js/ui/theme.js',
    '/XBZ-Prime-TV/js/ui/toast.js',
    '/XBZ-Prime-TV/js/ui/header.js',
    '/XBZ-Prime-TV/js/ui/sidebar.js',
    '/XBZ-Prime-TV/js/ui/ticker.js',
    '/XBZ-Prime-TV/js/ui/matches.js',
    '/XBZ-Prime-TV/js/ui/channels.js',
    '/XBZ-Prime-TV/js/ui/modal.js',
    '/XBZ-Prime-TV/js/app.js',
];

// CDN URLs to cache (with versioned URLs for cache-busting safety)
const CDN_URLS = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-brands-400.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/video.js/8.10.0/video-js.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/video.js/8.10.0/video.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.8/hls.min.js',
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap',
];

/* ==========================================
   INSTALL EVENT
   ========================================== */

self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        (async () => {
            try {
                const cache = await caches.open(CACHE_NAME);
                
                // Precache all app files
                console.log(`[SW] Precaching ${PRECACHE_URLS.length} app files...`);
                await cache.addAll(PRECACHE_URLS);

                // Cache CDN resources separately
                console.log(`[SW] Caching ${CDN_URLS.length} CDN resources...`);
                const cdnCache = await caches.open('xbz-cdn-v2');
                
                // Cache CDN resources individually to handle failures gracefully
                for (const url of CDN_URLS) {
                    try {
                        await cdnCache.add(url);
                    } catch (error) {
                        console.warn(`[SW] Failed to cache CDN resource: ${url}`, error);
                    }
                }

                console.log('[SW] Precache complete');

                // Force activation
                self.skipWaiting();
            } catch (error) {
                console.error('[SW] Install error:', error);
            }
        })()
    );
});

/* ==========================================
   ACTIVATE EVENT
   ========================================== */

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        (async () => {
            try {
                // Get all cache names
                const cacheNames = await caches.keys();
                
                // Delete old caches
                const deletePromises = cacheNames
                    .filter(name => {
                        return name.startsWith('xbz-') && 
                               name !== CACHE_NAME && 
                               name !== RUNTIME_CACHE && 
                               name !== API_CACHE &&
                               name !== 'xbz-cdn-v2';
                    })
                    .map(name => {
                        console.log(`[SW] Deleting old cache: ${name}`);
                        return caches.delete(name);
                    });

                await Promise.all(deletePromises);

                // Take control of all clients
                await self.clients.claim();

                console.log('[SW] Activation complete');

                // Notify clients of update
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        version: CACHE_NAME,
                    });
                });
            } catch (error) {
                console.error('[SW] Activate error:', error);
            }
        })()
    );
});

/* ==========================================
   FETCH EVENT
   ========================================== */

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) return;

    // Handle API requests
    if (url.href.includes('api.football-data.org')) {
        event.respondWith(handleAPIRequest(request));
        return;
    }

    // Handle GitHub raw content requests
    if (url.href.includes('raw.githubusercontent.com')) {
        event.respondWith(handleGitHubRequest(request));
        return;
    }

    // Handle CDN requests
    if (url.href.includes('cdnjs.cloudflare.com') || 
        url.href.includes('fonts.googleapis.com') ||
        url.href.includes('fonts.gstatic.com')) {
        event.respondWith(handleCDNRequest(request));
        return;
    }

    // Handle app shell requests
    event.respondWith(handleAppRequest(request));
});

/* ==========================================
   REQUEST HANDLERS
   ========================================== */

/**
 * Handle API requests with network-first strategy and caching
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>}
 */
async function handleAPIRequest(request) {
    try {
        // Try network first
        const networkResponse = await fetch(request.clone());
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Fallback to cache
        console.log('[SW] API request failed, trying cache:', request.url);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline fallback
        return new Response(
            JSON.stringify({ message: 'Offline - Data unavailable' }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}

/**
 * Handle GitHub raw content requests with stale-while-revalidate
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>}
 */
async function handleGitHubRequest(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    
    // Check cache first
    const cachedResponse = await cache.match(request);
    
    // Start network fetch (don't await)
    const networkFetch = fetch(request.clone())
        .then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(error => {
            console.warn('[SW] GitHub fetch failed:', error);
            return null;
        });
    
    // Return cached response immediately if available
    if (cachedResponse) {
        // Update cache in background
        networkFetch;
        return cachedResponse;
    }
    
    // Wait for network if no cache
    try {
        const networkResponse = await networkFetch;
        if (networkResponse) return networkResponse;
    } catch (error) {
        console.error('[SW] GitHub request failed completely:', error);
    }
    
    // Ultimate fallback
    return new Response(
        '#EXTM3U\n#EXTINF:-1,Offline - No Channels Available\n',
        {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        }
    );
}

/**
 * Handle CDN requests with cache-first strategy
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>}
 */
async function handleCDNRequest(request) {
    const cdnCache = await caches.open('xbz-cdn-v2');
    
    // Check cache first
    const cachedResponse = await cdnCache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Fetch from network and cache
    try {
        const networkResponse = await fetch(request.clone());
        
        if (networkResponse.ok) {
            cdnCache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] CDN request failed:', error);
        
        // Return empty response for stylesheets/scripts
        const contentType = request.headers.get('accept') || '';
        if (contentType.includes('text/css')) {
            return new Response('', { headers: { 'Content-Type': 'text/css' } });
        }
        if (contentType.includes('javascript')) {
            return new Response('', { headers: { 'Content-Type': 'application/javascript' } });
        }
        
        throw error;
    }
}

/**
 * Handle app shell requests with cache-first strategy
 * @param {Request} request - Fetch request
 * @returns {Promise<Response>}
 */
async function handleAppRequest(request) {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Fallback to network
    try {
        const networkResponse = await fetch(request.clone());
        
        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] App request failed:', error);
        
        // Return the main page for navigation requests (SPA fallback)
        if (request.mode === 'navigate') {
            const cachedHome = await caches.match('/XBZ-Prime-TV/');
            if (cachedHome) return cachedHome;
            
            return new Response(
                '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
                {
                    status: 200,
                    statusText: 'OK',
                    headers: { 'Content-Type': 'text/html' },
                }
            );
        }
        
        throw error;
    }
}

/* ==========================================
   MESSAGE EVENTS
   ========================================== */

self.addEventListener('message', (event) => {
    const { data } = event;

    if (!data) return;

    switch (data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CLEAR_CACHES':
            event.waitUntil(clearAllCaches());
            break;

        case 'UPDATE_CACHE':
            if (data.url) {
                event.waitUntil(updateCache(data.url));
            }
            break;

        case 'GET_VERSION':
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({
                    version: CACHE_NAME,
                    timestamp: Date.now(),
                });
            }
            break;

        case 'PRECACHE_URLS':
            if (data.urls && Array.isArray(data.urls)) {
                event.waitUntil(precacheUrls(data.urls));
            }
            break;

        default:
            console.log('[SW] Unknown message type:', data.type);
    }
});

/* ==========================================
   BACKGROUND SYNC
   ========================================== */

self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'refresh-playlist') {
        event.waitUntil(refreshPlaylistInBackground());
    } else if (event.tag === 'refresh-matches') {
        event.waitUntil(refreshMatchesInBackground());
    }
});

/**
 * Refresh playlist in background
 */
async function refreshPlaylistInBackground() {
    try {
        console.log('[SW] Background playlist refresh...');
        
        const urls = [
            'https://raw.githubusercontent.com/naimxbzbd/XBZ-Prime-TV/refs/heads/main/playlist.m3u',
            'https://raw.githubusercontent.com/sanjoykb/-KB-TV-Playlist/refs/heads/main/Github%20Auto%20Update%20Channel.m3u',
        ];

        for (const url of urls) {
            try {
                const response = await fetch(url, { cache: 'no-cache' });
                if (response.ok) {
                    const cache = await caches.open(RUNTIME_CACHE);
                    await cache.put(url, response.clone());
                    console.log(`[SW] Background cached: ${url}`);
                }
            } catch (error) {
                console.warn(`[SW] Background refresh failed for ${url}:`, error);
            }
        }

        // Notify clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'PLAYLIST_UPDATED',
                timestamp: Date.now(),
            });
        });
    } catch (error) {
        console.error('[SW] Background playlist refresh error:', error);
    }
}

/**
 * Refresh matches in background
 */
async function refreshMatchesInBackground() {
    try {
        console.log('[SW] Background matches refresh...');
        
        const cache = await caches.open(API_CACHE);
        const apiUrl = 'https://api.football-data.org/v4/matches';
        
        const response = await fetch(apiUrl, {
            headers: {
                'X-Auth-Token': '1343f48af11546bd8be28141f72e8739',
            },
        });

        if (response.ok) {
            await cache.put(apiUrl, response.clone());
            
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'MATCHES_UPDATED',
                    timestamp: Date.now(),
                });
            });
        }
    } catch (error) {
        console.error('[SW] Background matches refresh error:', error);
    }
}

/* ==========================================
   PUSH NOTIFICATIONS
   ========================================== */

self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        
        const options = {
            body: data.body || 'New update available',
            icon: '/XBZ-Prime-TV/assets/favicon.png',
            badge: '/XBZ-Prime-TV/assets/favicon.png',
            vibrate: [200, 100, 200],
            data: {
                url: data.url || '/XBZ-Prime-TV/',
                timestamp: Date.now(),
            },
            actions: data.actions || [],
            tag: data.tag || 'default',
            requireInteraction: data.requireInteraction || false,
        };

        event.waitUntil(
            self.registration.showNotification(
                data.title || 'XBZ Prime TV',
                options
            )
        );
    } catch (error) {
        console.error('[SW] Push notification error:', error);
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/XBZ-Prime-TV/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Check if a window is already open
                for (const client of clientList) {
                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window
                return clients.openWindow(url);
            })
    );
});

/* ==========================================
   PERIODIC BACKGROUND SYNC
   ========================================== */

self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic sync:', event.tag);

    if (event.tag === 'refresh-content') {
        event.waitUntil(refreshAllContent());
    }
});

/**
 * Refresh all content in background
 */
async function refreshAllContent() {
    try {
        console.log('[SW] Periodic content refresh...');
        
        await Promise.allSettled([
            refreshPlaylistInBackground(),
            refreshMatchesInBackground(),
        ]);

        console.log('[SW] Periodic refresh complete');
    } catch (error) {
        console.error('[SW] Periodic refresh error:', error);
    }
}

/* ==========================================
   CACHE UTILITIES
   ========================================== */

/**
 * Clear all caches
 */
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
            .filter(name => name.startsWith('xbz-'))
            .map(name => caches.delete(name));
        
        await Promise.all(deletePromises);
        console.log('[SW] All caches cleared');
    } catch (error) {
        console.error('[SW] Clear caches error:', error);
    }
}

/**
 * Update a specific URL in cache
 * @param {string} url - URL to update
 */
async function updateCache(url) {
    try {
        const cache = await caches.open(RUNTIME_CACHE);
        const response = await fetch(url, { cache: 'no-cache' });
        
        if (response.ok) {
            await cache.put(url, response);
            console.log(`[SW] Cache updated: ${url}`);
        }
    } catch (error) {
        console.error(`[SW] Cache update error for ${url}:`, error);
    }
}

/**
 * Precache additional URLs
 * @param {Array} urls - URLs to precache
 */
async function precacheUrls(urls) {
    try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(urls);
        console.log(`[SW] Precached ${urls.length} URLs`);
    } catch (error) {
        console.error('[SW] Precache error:', error);
    }
}

/* ==========================================
   FETCH EVENT LISTENER REGISTRATION
   ========================================== */

// Ensure fetch handler is set up
self.addEventListener('fetch', (event) => {
    // This is a duplicate handler that won't conflict
    // It ensures we always handle video/stream requests properly
    const url = new URL(event.request.url);
    
    // Let video streams pass through without caching
    if (url.pathname.endsWith('.m3u8') || 
        url.pathname.endsWith('.ts') || 
        url.pathname.endsWith('.mp4') ||
        url.pathname.endsWith('.mpd') ||
        url.pathname.endsWith('.m4s') ||
        url.pathname.endsWith('.m4v')) {
        // Don't cache video streams, pass through to network
        return;
    }
});

console.log('[SW] Service Worker loaded and ready');
