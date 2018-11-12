class DBHelper {

  static idbDatabase() {
    // if (window.SyncManage || navigator.serviceWorker) {
    //   return Promise.resolve;
    // }
    return idb.open('mws-restaurant', 2, (upgradeDB) => {
      switch(upgradeDB.oldVersion) {
        case 0:
          upgradeDB.createObjectStore('restaurantDb', {
            keyPath: 'id'
          }).createIndex('id', 'id');
        case 1: 
          upgradeDB.createObjectStore('reviews', { keyPath: 'id' })
          .createIndex('restaurant_id', 'restaurant_id');
        case 2:
          upgradeDB.createObjectStore('offlineFavourites', { keyPath: 'restaurant_id' })
          .createIndex('restaurant_id', 'restaurant_id');

          upgradeDB.createObjectStore('offlineReviews', { keyPath: 'id', autoIncrement: true })
          .createIndex('restaurant_id', 'restaurant_id');
          
        default:
      }
    });
  };


  static syncFavorites() {
    console.log('Sync Favorites with Server');
    return DBHelper.idbDatabase().then(db => {
      const tx = db.transaction('offlineFavourites');
      const syncFavoriteStore = tx.objectStore('offlineFavourites');

      return syncFavoriteStore.getAll().then(syncs => {
        const PUT = {method: 'PUT'};

        return Promise.all(syncs.map(sync => {
          return fetch(sync.url, PUT).then(res => {
            console.log('making a fetch from sw to ', sync.url);
            if (!res.ok) return Promise.reject(`PUT Fetch to ${res.url} failed with code ${res.status}`);
            // sync response from server to local iDB and remove each successful fetch from the syncFavorites store.
            // Any successful request should be made only once, instead of retrying it if another fails.
            return res.json().then(restaurant => {
              DBHelper.idbDatabase().then(db => {
                console.log('hihihihi');
                const tx = db.transaction('restaurantDb', 'readwrite');
                const restaurantStore = tx.objectStore('restaurantDb');      
                restaurantStore.put(restaurant);
                return tx.complete;
              })
            }).then((blank, id = sync.restaurant_id) => {
                console.log('deleting offline restaurant fav')
                id = Number(id); // Make sure id is a numbder. iDB doesn't accept strings as numbers.
                 DBHelper.idbDatabase().then(db => {
                  const tx = db.transaction('offlineFavourites', 'readwrite');
                  const syncFavoriteStore = tx.objectStore('offlineFavourites');
                  console.log('deleting from idb fav');
                  syncFavoriteStore.delete(id);
                  return tx.complete;
                });
            });
          })
        }));
      }) // the catch is implemented in the service worker Sync listener.
    });
  }

static syncReviews() {
  console.log('hea');
  return DBHelper.idbDatabase().then(db => {
    // get all offline reviews
    const tx = db.transaction('offlineReviews');
    const offlineReviewStore = tx.objectStore('offlineReviews');
    return offlineReviewStore.getAll();
  }).then(offlineReviews => {
    return Promise.all(offlineReviews.map(offlineReview => {
    const offlineReviewId = offlineReview.id;
    delete offlineReview.id; // Make sure offlineReview.id isn't passed to API
    return DBHelper.postReview(offlineReview)
      .then(fetchedReview => {
        return DBHelper.idbDatabase().then(db => {
          const tx = db.transaction('reviews', 'readwrite');
          const reviewStore = tx.objectStore('reviews');
          reviewStore.put(fetchedReview);
          return tx.complete;
        })
      }).then(() => {
          const id = Number(offlineReviewId); // Make sure id is a number for iDB
          return DBHelper.idbDatabase().then(db => {
            const tx = db.transaction('offlineReviews', 'readwrite');
            const offlineReviewStore = tx.objectStore('offlineReviews');
            console.log('deleting from offline reviews database');
            offlineReviewStore.delete(id);
            return tx.complete;
          });
        });
    }))
  }).catch(console.error);
}

static postReview(data) {
  const url = `http://localhost:1337/reviews/`; // has to fail
  const POST = {
    method: "POST",
    body: JSON.stringify(data)
  };
  return fetch(url, POST).then(response => {
    // if offline review was POSTED successfully, save review to iDB
    // with response data
    if (!response.ok) {
      return Promise.reject(`Failed to POST offline review id: ${data.id}`);
    }
    return response.json();
  });
}

  /**
   * Save a restaurant or array of restaurants into idb, using promises.
   */
  static putRestaurants(restaurants, forceUpdate = false) {
    if (!restaurants.push) restaurants = [restaurants];
    return DBHelper.idbDatabase().then(db => {
      const store = db.transaction('restaurantDb', 'readwrite').objectStore('restaurantDb');
      Promise.all(restaurants.map(networkRestaurant => {
        return store.get(networkRestaurant.id).then(idbRestaurant => {
          if (forceUpdate) return store.put(networkRestaurant);
          if (!idbRestaurant || new Date(networkRestaurant.updatedAt) > new Date(idbRestaurant.updatedAt)) {
            return store.put(networkRestaurant);
          }
        });
      })).then(function () {
        return store.complete;
      });
    });
  }

  /**
   * Get a restaurant, by its id, or all stored restaurants in idb using promises.
   * If no argument is passed, all restaurants will returned.
   */
  static getRestaurants(id = undefined) {
    return DBHelper.idbDatabase().then(db => {
      const store = db.transaction('restaurants').objectStore('restaurants');
      if (id) return store.get(Number(id));
      return store.getAll();
    });
  }

  /**
   * Save a review or array of reviews into idb, using promises
   */
  static putReviews(reviews) {
    if (!reviews.push) reviews = [reviews];
    return DBHelper.idbDatabase().then(db => {
      const store = db.transaction('reviews', 'readwrite').objectStore('reviews');
      Promise.all(reviews.map(networkReview => {
        return store.get(networkReview.id).then(idbReview => {
          if (!idbReview || new Date(networkReview.updatedAt) > new Date(idbReview.updatedAt)) {
            return store.put(networkReview);
          }
        });
      })).then(function () {
        return store.complete;
      });
    });
  }

  /**
   * Get all reviews for a specific restaurant, by its id, using promises.
   */
  static getReviewsForRestaurant(id) {
    return DBHelper.idbDatabase().then(db => {
      const storeIndex = db.transaction('reviews').objectStore('reviews').index('restaurant_id');
      return storeIndex.getAll(Number(id));
    });
  }

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 8080 // Change this to your server port
    const url = 'http://localhost:1337/restaurants'

    return url;
  }

  /**
   * Fetch all restaurants.
   */

  static handleErrors(response) {
    // If Network failed
    if (!response.ok) {
      // Open Database and get url reference from idb
      DBHelper.idbDatabase().then((db) => {
        if (!db) throw Error(response.statusText);
        let tx = db.transaction('restaurantDb', 'readwrite');
        let store = tx.objectStore('restaurantDb');
        if (store.getAll() <= 0) {
          throw Error(response.statusText);
        }
        return store.getAll();
      });
    }
    return response.json();
  }


  static fetchRestaurants(callback) {

    if (navigator.onLine) {
      return fetch(this.DATABASE_URL)
      .then(this.handleErrors)
        .then(res => {
          const restaurants = res;
          // Store Fetched Request in idb
          DBHelper.idbDatabase().then((db) => {
            if (!db) return;
            let tx = db.transaction('restaurantDb', 'readwrite');
            let store = tx.objectStore('restaurantDb');
            restaurants.forEach(function(restaurant) {
              store.put(restaurant);
            });
            // limit store to 30 items
            let data = store.index('id').openCursor(null, "prev").then(function(cursor) {
              return cursor.advance(30);
            }).then(function deleteRest(cursor) {
              if (!cursor) return;
              cursor.delete();
              return cursor.continue().then(deleteRest);
            });

            return store.getAll(); // Return Stored Data
          }).then(restaurants => {
            callback(null, restaurants);
            return restaurants;
          });
        })
          .catch(err => console.log(err))
    } else {
      return DBHelper.idbDatabase().then((db) => {
        if (!db) return;
        let tx = db.transaction('restaurantDb', 'readwrite');
        let store = tx.objectStore('restaurantDb');
          return store.getAll(); // Return Stored Data
        }).then(restaurants => {
          callback(null, restaurants);
          return restaurants;
        });
    }
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.jpg`);
  }


  // in src/js/dbhelper.js inside the DBHelper class
  static fetchReviewsByRestaurantId(restaurant_id) {
    console.log('fetching reviews')

    if (navigator.onLine) {
      return fetch(`http://localhost:1337/reviews/?restaurant_id=${restaurant_id}`).then(response => {
        console.log('response is ', response);
        if (!response.ok) {
          console.log('network error 1');
          return DBHelper.getReviewsForRestaurant(restaurant_id).then(idbReviews => {
            // if no reviews were found on idb return null
            if (idbReviews.length < 1) return null;
            return idbReviews;
          }) || Promise.reject("Reviews couldn't be fetched from network"); // return null to handle error, as though there are no reviews.
        }
        return response.json();
      }).then(fetchedReviews => {
        // if reviews could be fetched from network:
        // TODO: store reviews on idb
        DBHelper.putReviews(fetchedReviews);
        console.log(fetchedReviews);
        return fetchedReviews;
      }).catch(networkError => {
        // if reviews couldn't be fetched from network:
        // TODO: try to get reviews from idb
        console.log('network error 2');
        console.log(`${networkError}`);
        return DBHelper.getReviewsForRestaurant(restaurant_id).then(idbReviews => {
          // if no reviews were found on idb return null
          if (idbReviews.length < 1) return null;
          return idbReviews;
        }) || null; // return null to handle error, as though there are no reviews.
      });
    } else {
      return DBHelper.getReviewsForRestaurant(restaurant_id).then(idbReviews => {
        // if no reviews were found on idb return null
        if (idbReviews.length < 1) return null;
        return idbReviews;
      }) 
    }
       
  }

  /**
   * Map marker for a restaurant.
   */
  // static mapMarkerForRestaurant(restaurant, map) {
  //   const marker = new google.maps.Marker({
  //     position: restaurant.latlng,
  //     title: restaurant.name,
  //     url: DBHelper.urlForRestaurant(restaurant),
  //     map: map,
  //     animation: google.maps.Animation.DROP
  //   });
  //   marker.tabindex = -1;
  //   return marker;
  // }

}
