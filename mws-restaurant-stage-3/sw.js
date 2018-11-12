self.importScripts('js/idb.js');
self.importScripts('js/dbHelper.js');

const staticCacheName = 'restaurant-3';

self.addEventListener('install', event => {
  const toCache = [
    'http://127.0.0.1:8080/',
    'http://127.0.0.1:8080/index.html',
    'http://127.0.0.1:8080/restaurant.html',
    'http://127.0.0.1:8080/css/styles.css', 
    'http://127.0.0.1:8080/js/jquery.js',
    'http://127.0.0.1:8080/js/jqueryModal.js',
    'http://127.0.0.1:8080/js/register.js',
    'http://127.0.0.1:8080/js/lazy.js',
    'http://127.0.0.1:8080/js/fav.js',
    'http://127.0.0.1:8080/js/idb.js',
    'http://127.0.0.1:8080/js/dbHelper.js',
    'http://127.0.0.1:8080/js/main.js',
    'http://127.0.0.1:8080/js/restaurantJs.js',
    'http://127.0.0.1:8080/fonts/google.woff2',
    'http://127.0.0.1:8080/restaurant.html?id=1',
    'http://127.0.0.1:8080/restaurant.html?id=2',
    'http://127.0.0.1:8080/restaurant.html?id=3',
    'http://127.0.0.1:8080/restaurant.html?id=4',
    'http://127.0.0.1:8080/restaurant.html?id=5',
    'http://127.0.0.1:8080/restaurant.html?id=6',
    'http://127.0.0.1:8080/restaurant.html?id=7',
    'http://127.0.0.1:8080/restaurant.html?id=8',
    'http://127.0.0.1:8080/restaurant.html?id=9',
    'http://127.0.0.1:8080/restaurant.html?id=10'
  ];

  event.waitUntil(caches.open(staticCacheName).then(cache => {
    toCache.forEach(link => cache.add(link));
  }))
});

self.addEventListener('fetch', function(event) {
  if (event.request.method === 'GET') {
     
    event.respondWith(caches.match(event.request).then(function(response) {

      if (event.request.url.indexOf('/reviews/?') != -1 ) {   
         return fetch(event.request);
      }


      if (event.request.url.indexOf('http://localhost:1337/restaurants') != -1 ) {   
        return fetch(event.request);
     }

      // Fetch and cache the response if response has not been cached.
      return response || fetch(event.request).then(fetchResponse => {
        return caches.open(staticCacheName).then(cache => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        })
      });
    }));
  }
});

self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(cacheNames) {
    return Promise.all(cacheNames.filter(function(cacheName) {
      return cacheName.startsWith('restaurant-') && cacheName != staticCacheName;
    }).map(function(cacheName) {
      return caches.delete(cacheName);
    }));
  }));
});

self.addEventListener('sync', event => {

  if (event.tag == 'syncFavorites') {
    console.log('executing sync favourties');
    event.waitUntil(DBHelper.syncFavorites().catch(err => {
        if (event.lastChance) {
          console.error("Background Sync failed all attempts to sync. No more attempts will be made.");
        } else {
          console.log("Background Sync failed, Browser will retry later as it sees fit.");
        }
        console.error("Reason Background Sync failed: ", err);
      })
    )
  }

  if (event.tag == 'syncReviews') {
    console.log('executing sync reviews');
    event.waitUntil(DBHelper.syncReviews().catch(err => {
      if (event.lastChance) {
        console.error("Background Sync failed all attempts to sync. No more attempts will be made.");
        DBHelper.idbDatabase().then(db => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          store.clear();
          return tx.complete;
        });
      } else {
        console.log("Background Sync failed, Browser will retry later as it sees fit.");
      }
      console.error("Reason Background Sync failed: ", err);
    })
  )}
});
