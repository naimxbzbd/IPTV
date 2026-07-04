/*=============================================
  XBZ Prime TV - Service Worker
  Offline Cache, Background Sync & Updates
  =============================================*/

'use strict';

/* ==========================================
   CACHE CONFIGURATION
   ========================================== */

var CACHE_NAME = 'xbz-prime-tv-v2';
var RUNTIME_CACHE = 'xbz-prime-tv-runtime-v2';
var API_CACHE = 'xbz-prime-tv-api-v2';

var PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/logo.svg',
    '/assets/favicon.png',
    '/assets/placeholder.webp',
    '/css/variables.css',
    '/css/reset.css',
    '/css/layout.css',
    '/css/components.css',
    '/css/animations.css',
    '/css/responsive.css',
    '/js/config.js',
    '/js/state.js',
    '/js/utils.js',
    '/js/api/github.js',
    '/js/api/football.js',
    '/js/api/breaking.js',
    '/js/player/player.js',
    '/js/ui/theme.js',
    '/js/ui/toast.js',
    '/js/ui/header.js',
    '/js/ui/sidebar.js',
    '/js/ui/ticker.js',
    '/js/ui/matches.js',
    '/js/ui/channels.js',
    '/js/ui/modal.js',
    '/js/app.js'
];

var CDN_URLS = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-brands-400.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/video.js/8.10.0/video-js.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/video.js/8.10.0/video.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.8/hls.min.js',
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap'
];

/* ==========================================
   INSTALL EVENT
   ========================================== */

self.addEventListener('install', function(event) {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        (async function() {
            try {
                var cache = await caches.open(CACHE_NAME);
                
                console.log('[SW] Precaching ' + PRECACHE_URLS.length + ' app files...');
                await cache.addAll(PRECACHE_URLS);

                var cdnCache = await caches.open('xbz-cdn-v2');
                
                console.log('[SW] Caching ' + CDN_URLS.length + ' CDN resources...');
                for (var i = 0; i < CDN_URLS.length; i++) {
                    try {
                        await cdnCache.add(CDN_URLS[i]);
                    } catch (error) {
                        console.warn('[SW] Failed to cache CDN resource: ' + CDN_URLS[i]);
                    }
                }

                console.log('[SW] Precache complete');
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

self.addEventListener('activate', function(event) {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        (async function() {
            try {
                var cacheNames = await caches.keys();
                
                var deletePromises = cacheNames
                    .filter(function(name) {
                        return name.indexOf('xbz-') === 0 && 
                               name !== CACHE_NAME && 
                               name !== RUNTIME_CACHE && 
                               name !== API_CACHE &&
                               name !== 'xbz-cdn-v2';
                    })
                    .map(function(name) {
                        console.log('[SW] Deleting old cache: ' + name);
                        return caches.delete(name);
                    });

                await Promise.all(deletePromises);
                await self.clients.claim();

                console.log('[SW] Activation complete');

                var clients = await self.clients.matchAll();
                clients.forEach(function(client) {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        version: CACHE_NAME
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

self.addEventListener('fetch', function(event) {
    var request = event.request;
    var url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (!url.protocol.startsWith('http')) return;

    // Handle API requests
    if (url.href.indexOf('api.football-data.org') !== -1) {
        event.respondWith(handleAPIRequest(request));
        return;
    }

    // Handle GitHub raw content requests
    if (url.href.indexOf('raw.githubusercontent.com') !== -1) {
        event.respondWith(handleGitHubRequest(request));
        return;
    }

    // Handle CDN requests
    if (url.href.indexOf('cdnjs.cloudflare.com') !== -1 || 
        url.href.indexOf('fonts.googleapis.com') !== -1 ||
        url.href.indexOf('fonts.gstatic.com') !== -1) {
        event.respondWith(handleCDNRequest(request));
        return;
    }

    // Handle video stream requests - pass through without caching
    if (url.pathname.indexOf('.m3u8') !== -1 || 
        url.pathname.indexOf('.ts') !== -1 || 
        url.pathname.indexOf('.mp4') !== -1 ||
        url.pathname.indexOf('.mpd') !== -1 ||
        url.pathname.indexOf('.m4s') !== -1 ||
        url.pathname.indexOf('.m4v') !== -1) {
        return;
    }

    // Handle app shell requests
    event.respondWith(handleAppRequest(request));
});

/* ==========================================
   REQUEST HANDLERS
   ========================================== */

/**
 * Handle API requests with network-first strategy
 */
async function handleAPIRequest(request) {
    try {
        var networkResponse = await fetch(request.clone());
        
        if (networkResponse.ok) {
            var cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] API request failed, trying cache: ' + request.url);
        var cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return new Response(
            JSON.stringify({ message: 'Offline - Data unavailable' }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

/**
 * Handle GitHub raw content requests with stale-while-revalidate
 */
async function handleGitHubRequest(request) {
    var cache = await caches.open(RUNTIME_CACHE);
    var cachedResponse = await cache.match(request);
    
    var networkFetch = fetch(request.clone())
        .then(function(response) {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(function(error) {
            console.warn('[SW] GitHub fetch failed:', error);
            return null;
        });
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        var networkResponse = await networkFetch;
        if (networkResponse) return networkResponse;
    } catch (error) {
        console.error('[SW] GitHub request failed completely:', error);
    }
    
    return new Response(
        '#EXTM3U\n#EXTINF:-1,Offline - No Channels Available\n',
        {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        }
    );
}

/**
 * Handle CDN requests with cache-first strategy
 */
async function handleCDNRequest(request) {
    var cdnCache = await caches.open('xbz-cdn-v2');
    var cachedResponse = await cdnCache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        var networkResponse = await fetch(request.clone());
        
        if (networkResponse.ok) {
            cdnCache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] CDN request failed:', error);
        
        var contentType = request.headers.get('accept') || '';
        if (contentType.indexOf('text/css') !== -1) {
            return new Response('', { headers: { 'Content-Type': 'text/css' } });
        }
        if (contentType.indexOf('javascript') !== -1) {
            return new Response('', { headers: { 'Content-Type': 'application/javascript' } });
        }
        
        throw error;
    }
}

/**
 * Handle app shell requests with cache-first strategy
 */
async function handleAppRequest(request) {
    var cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        var networkResponse = await fetch(request.clone());
        
        if (networkResponse.ok) {
            var cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] App request failed:', error);
        
        if (request.mode === 'navigate') {
            var cachedHome = await caches.match('/');
            if (cachedHome) return cachedHome;
            
            return new Response(
                '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Offline</title></head><body style="background:#0a0e27;color:#f0f0f5;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;"><div><h1>Offline</h1><p>Please check your internet connection</p></div></body></html>',
                {
                    status: 200,
                    statusText: 'OK',
                    headers: { 'Content-Type': 'text/html' }
                }
            );
        }
        
        throw error;
    }
}

/* ==========================================
   MESSAGE EVENTS
   ========================================== */

self.addEventListener('message', function(event) {
    var data = event.data;
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
                    timestamp: Date.now()
                });
            }
            break;

        default:
            console.log('[SW] Unknown message type:', data.type);
    }
});

/* ==========================================
   BACKGROUND SYNC
   ========================================== */

self.addEventListener('sync', function(event) {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'refresh-playlist') {
        event.waitUntil(refreshPlaylistInBackground());
    } else if (event.tag === 'refresh-matches') {
        event.waitUntil(refreshMatchesInBackground());
    }
});

async function refreshPlaylistInBackground() {
    try {
        console.log('[SW] Background playlist refresh...');
        
        var urls = [
            'https://raw.githubusercontent.com/naimxbzbd/XBZ-Prime-TV/refs/heads/main/playlist.m3u',
            'https://raw.githubusercontent.com/sanjoykb/-KB-TV-Playlist/refs/heads/main/Github%20Auto%20Update%20Channel.m3u'
        ];

        for (var i = 0; i < urls.length; i++) {
            try {
                var response = await fetch(urls[i], { cache: 'no-cache' });
                if (response.ok) {
                    var cache = await caches.open(RUNTIME_CACHE);
                    await cache.put(urls[i], response.clone());
                    console.log('[SW] Background cached: ' + urls[i]);
                }
            } catch (error) {
                console.warn('[SW] Background refresh failed for ' + urls[i] + ':', error);
            }
        }

        var clients = await self.clients.matchAll();
        clients.forEach(function(client) {
            client.postMessage({
                type: 'PLAYLIST_UPDATED',
                timestamp: Date.now()
            });
        });
    } catch (error) {
        console.error('[SW] Background playlist refresh error:', error);
    }
}

async function refreshMatchesInBackground() {
    try {
        console.log('[SW] Background matches refresh...');
        
        var cache = await caches.open(API_CACHE);
        var apiUrl = 'https://api.football-data.org/v4/matches';
        
        var response = await fetch(apiUrl, {
            headers: {
                'X-Auth-Token': '1343f48af11546bd8be28141f72e8739'
            }
        });

        if (response.ok) {
            await cache.put(apiUrl, response.clone());
            
            var clients = await self.clients.matchAll();
            clients.forEach(function(client) {
                client.postMessage({
                    type: 'MATCHES_UPDATED',
                    timestamp: Date.now()
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

self.addEventListener('push', function(event) {
    if (!event.data) return;

    try {
        var data = event.data.json();
        
        var options = {
            body: data.body || 'New update available',
            icon: '/assets/favicon.png',
            badge: '/assets/favicon.png',
            vibrate: [200, 100, 200],
            data: {
                url: data.url || '/',
                timestamp: Date.now()
            },
            actions: data.actions || [],
            tag: data.tag || 'default',
            requireInteraction: data.requireInteraction || false
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

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    var url = '/';
    if (event.notification.data && event.notification.data.url) {
        url = event.notification.data.url;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function(clientList) {
                for (var i = 0; i < clientList.length; i++) {
                    var client = clientList[i];
                    if (client.url.indexOf(url) !== -1 && 'focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow(url);
            })
    );
});

/* ==========================================
   PERIODIC BACKGROUND SYNC
   ========================================== */

self.addEventListener('periodicsync', function(event) {
    console.log('[SW] Periodic sync:', event.tag);

    if (event.tag === 'refresh-content') {
        event.waitUntil(refreshAllContent());
    }
});

async function refreshAllContent() {
    try {
        console.log('[SW] Periodic content refresh...');
        await Promise.allSettled([
            refreshPlaylistInBackground(),
            refreshMatchesInBackground()
        ]);
        console.log('[SW] Periodic refresh complete');
    } catch (error) {
        console.error('[SW] Periodic refresh error:', error);
    }
}

/* ==========================================
   CACHE UTILITIES
   ========================================== */

async function clearAllCaches() {
    try {
        var cacheNames = await caches.keys();
        var deletePromises = cacheNames
            .filter(function(name) {
                return name.indexOf('xbz-') === 0;
            })
            .map(function(name) {
                return caches.delete(name);
            });
        
        await Promise.all(deletePromises);
        console.log('[SW] All caches cleared');
    } catch (error) {
        console.error('[SW] Clear caches error:', error);
    }
}

async function updateCache(url) {
    try {
        var cache = await caches.open(RUNTIME_CACHE);
        var response = await fetch(url, { cache: 'no-cache' });
        
        if (response.ok) {
            await cache.put(url, response);
            console.log('[SW] Cache updated: ' + url);
        }
    } catch (error) {
        console.error('[SW] Cache update error for ' + url + ':', error);
    }
}

console.log('[SW] Service Worker loaded and ready');
