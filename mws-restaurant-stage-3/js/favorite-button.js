// Favourite Button Click
function handleClick() {
  let online = window.navigator.onLine;

  if(!online) { // Check if offline when fav button is clicked
    console.log('Submission will be made when an internet connection has been established');
    $('#offlineModal').modal();
    setTimeout(()=> {
      $.modal.close();
    }, 2000)
  }

  const restaurantId = Number(this.dataset.id); // Get restaurant Id

  let fav = this.getAttribute('aria-pressed');

  if (fav == 'true') {
    fav = 'false';
    this.setAttribute("style", "background-color: white;");
    this.setAttribute('aria-pressed', fav);
  } else {
    fav = 'true';
    this.setAttribute("style", "background-color: yellow;");
    this.setAttribute('aria-pressed', fav);
  }

  const url = `http://localhost:1337/restaurants/${restaurantId}/?is_favorite=${fav}`;
  const PUT = {method: 'PUT'};

  // if either SyncManager OR Service Worker aren't supported, just make a PUT fetch as usual
  if (!window.SyncManager || !navigator.serviceWorker) {
    return fetch(url, PUT);
  }

  console.log(fav);
  // Save to offline Favourites for Sync
  return DBHelper.idbDatabase().then(db => {
    console.log('save to offline fav');
    const tx = db.transaction('offlineFavourites', 'readwrite');
    const syncFavoriteStore = tx.objectStore('offlineFavourites');
    const sync = {"restaurant_id": restaurantId, "url": url};
    syncFavoriteStore.put(sync);
    return tx.complete;
  }).then(()=> {
    // Update local idb with new fav value
    return DBHelper.idbDatabase().then(db => {
      const tx = db.transaction('restaurantDb', 'readwrite');
      const restaurantStore = tx.objectStore('restaurantDb');

      restaurantStore.get(restaurantId).then(restaurant => {
        const isoDate = new Date().toISOString(); // sails actually uses ISO date format
        restaurant.is_favorite = String(fav);
        restaurant.updatedAt = isoDate;
        restaurant.awaitingSync = true;
        restaurantStore.put(restaurant);
      });

      return tx.complete;
    });
  }).then(() => {
    // register sync iDB transaction for online and offline sync
    return navigator.serviceWorker.ready.then(function (reg) {
      console.log('talking to service worker sync fav');
      reg.sync.register('syncFavorites');
    })
  }).catch((e) => {
    console.error(e);
    return fetch(url, PUT);
  });
}



// Create Favourite Button
function favoriteButton(restaurant) {
  const button = document.createElement('button');
  button.innerHTML = "&#x2764;"; // this is the heart symbol in hex code
  button.className = "fav"; // you can use this class name to style your button
  button.dataset.id = restaurant.id; // store restaurant id in dataset for later
  button.setAttribute('aria-label', `Mark ${restaurant.name} as a favorite`);
  button.setAttribute('aria-pressed', restaurant.is_favorite);
  
  if (button.getAttribute('aria-pressed') == 'true'){
    button.setAttribute("style", "background-color: yellow;");
  }

  button.onclick = handleClick;

  return button;
}