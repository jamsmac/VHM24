const CACHE_VERSION = 'vendhub-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/tasks',
  '/offline.html',
];

// Maximum cache sizes
const MAX_DYNAMIC_CACHE_SIZE = 50;
const MAX_API_CACHE_SIZE = 100;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error('[SW] Failed to cache static assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('vendhub-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first for API, cache first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstStrategy(request, API_CACHE)
    );
    return;
  }

  // Static assets - Cache first, fallback to network
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      cacheFirstStrategy(request, STATIC_CACHE)
    );
    return;
  }

  // HTML pages - Network first, fallback to cache
  if (request.destination === 'document') {
    event.respondWith(
      networkFirstStrategy(request, DYNAMIC_CACHE)
    );
    return;
  }

  // Default - network only
  event.respondWith(fetch(request));
});

// Cache first strategy
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }

    console.log('[SW] Fetching from network:', request.url);
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error);
    return new Response('Offline - resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Network first strategy
async function networkFirstStrategy(request, cacheName) {
  try {
    console.log('[SW] Fetching from network:', request.url);
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      limitCacheSize(cacheName, cacheName === API_CACHE ? MAX_API_CACHE_SIZE : MAX_DYNAMIC_CACHE_SIZE);
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
      console.log('[SW] Serving from cache:', request.url);
      return cached;
    }

    // Return offline page for HTML requests
    if (request.destination === 'document') {
      const offlinePage = await cache.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }

    return new Response('Offline - resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Limit cache size
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    console.log(`[SW] Cache ${cacheName} exceeded max size, cleaning up...`);
    await cache.delete(keys[0]);
    limitCacheSize(cacheName, maxSize);
  }
}

// Background sync for pending tasks
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-pending-tasks') {
    event.waitUntil(syncPendingTasks());
  }

  if (event.tag === 'sync-pending-photos') {
    event.waitUntil(syncPendingPhotos());
  }
});

// Sync pending tasks
async function syncPendingTasks() {
  try {
    console.log('[SW] Syncing pending tasks...');

    // Get pending tasks from IndexedDB or localStorage
    const pendingTasks = await getPendingTasks();

    for (const task of pendingTasks) {
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(task),
        });

        if (response.ok) {
          await removePendingTask(task.id);
          console.log('[SW] Task synced:', task.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync task:', task.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync pending tasks failed:', error);
  }
}

// Sync pending photos
async function syncPendingPhotos() {
  try {
    console.log('[SW] Syncing pending photos...');

    // Get pending photos from IndexedDB
    const pendingPhotos = await getPendingPhotos();

    for (const photo of pendingPhotos) {
      try {
        const formData = new FormData();
        formData.append('file', photo.file);
        formData.append('entity_type', photo.entity_type);
        formData.append('entity_id', photo.entity_id);
        formData.append('category_code', photo.category_code);

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          await removePendingPhoto(photo.id);
          console.log('[SW] Photo synced:', photo.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync photo:', photo.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync pending photos failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingTasks() {
  // TODO: Implement IndexedDB read
  return [];
}

async function removePendingTask(taskId) {
  // TODO: Implement IndexedDB delete
}

async function getPendingPhotos() {
  // TODO: Implement IndexedDB read
  return [];
}

async function removePendingPhoto(photoId) {
  // TODO: Implement IndexedDB delete
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const title = data.title || 'VendHub Manager';
  const options = {
    body: data.body || 'У вас новое уведомление',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if already open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

console.log('[SW] Service worker loaded');
