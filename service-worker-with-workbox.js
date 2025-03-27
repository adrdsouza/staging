// public/sw.js
// Service worker using Workbox for better caching strategies

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// If workbox doesn't load, fall back to basic service worker
if (!workbox) {
  console.log('Workbox failed to load, falling back to basic service worker');
  self.addEventListener('fetch', (event) => {
    // Simple fallback fetch event handler
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      }).catch(() => {
        // If both cache and network fail, try to serve offline page
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return new Response('Network error happened', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
    );
  });
} else {
  console.log('Workbox loaded successfully!');

  // Customize workbox configuration
  workbox.setConfig({
    debug: false, // Set to true for debugging
  });

  // Cache the Google Fonts stylesheets
  workbox.routing.registerRoute(
    /^https:\/\/fonts\.googleapis\.com/,
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'google-fonts-stylesheets',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          maxEntries: 10,
        }),
      ],
    })
  );

  // Cache the Google Fonts webfont files
  workbox.routing.registerRoute(
    /^https:\/\/fonts\.gstatic\.com/,
    new workbox.strategies.CacheFirst({
      cacheName: 'google-fonts-webfonts',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
          maxEntries: 30,
        }),
      ],
    })
  );

  // Cache images from any domain including CDN
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );

  // Cache CSS, JS, and Web Worker files
  workbox.routing.registerRoute(
    ({ request }) => 
      request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'worker',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
    })
  );

  // Cache product API responses
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/product'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'product-api',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 1 * 60 * 60, // 1 hour cache
        }),
      ],
    })
  );

  // Cache products list API responses
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/products'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'products-api',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 2 * 60 * 60, // 2 hours cache
        }),
      ],
    })
  );

  // Cache categories API responses
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/categories'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'categories-api',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours cache
        }),
      ],
    })
  );

  // Use the NetworkOnly strategy for cart and payment operations
  workbox.routing.registerRoute(
    ({ url }) => 
      url.pathname.startsWith('/api/cart') || 
      url.pathname.startsWith('/api/process-nmi') ||
      url.pathname.startsWith('/api/create-order'),
    new workbox.strategies.NetworkOnly()
  );

  // Use the NetworkFirst strategy for all other API endpoints
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-general',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 10 * 60, // 10 minutes cache
        }),
      ],
    })
  );

  // Use NetworkFirst for HTML navigation requests
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'pages',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 25,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }),
      ],
    })
  );

  // Use CacheFirst for manifest, favicons etc
  workbox.routing.registerRoute(
    ({ url }) => 
      url.pathname.endsWith('manifest.json') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.includes('apple-touch-icon'),
    new workbox.strategies.CacheFirst({
      cacheName: 'manifest-and-icons',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  );

  // Fallback to offline page for navigation requests that fail
  workbox.routing.setCatchHandler(({ event }) => {
    if (event.request.destination === 'document') {
      return caches.match('/offline.html');
    }
    
    if (event.request.destination === 'image') {
      return caches.match('/placeholder-image.jpg');
    }
    
    return Response.error();
  });

  // Background sync for forms or other pending requests
  if ('sync' in self.registration) {
    self.addEventListener('sync', (event) => {
      if (event.tag === 'order-sync') {
        event.waitUntil(syncPendingOrders());
      }
    });
  }

  // Function to sync pending orders
  async function syncPendingOrders() {
    try {
      const cache = await caches.open('pending-orders');
      
      // Get all cached requests
      const requests = await cache.keys();
      
      // Process each request
      for (const request of requests) {
        try {
          const data = await cache.match(request);
          if (!data) continue;
          
          const orderData = await data.json();
          
          // Attempt to send the order again
          const response = await fetch('/api/create-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
          });
          
          if (response.ok) {
            // If successful, remove from pending cache
            await cache.delete(request);
            console.log('Successfully synced pending order');
          }
        } catch (err) {
          console.error('Error processing pending order:', err);
        }
      }
    } catch (err) {
      console.error('Failed to sync pending orders:', err);
    }
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      data: {
        url: data.url,
      },
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (err) {
    console.error('Error showing push notification:', err);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
