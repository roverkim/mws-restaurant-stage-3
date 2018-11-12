let restaurants,
  neighborhoods,
  cuisines;

var map;
var markers = [];

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
let fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
let fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    option.className += "radio"
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
let fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
let fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize Google map, called from HTML.
 */
// window.initMap = () => {
//   let loc = {
//     lat: 40.722216,
//     lng: -73.987501
//   };
//   self.map = new google.maps.Map(document.getElementById('map'), {
//     zoom: 12,
//     center: loc,
//     scrollwheel: false
//   });
//   updateRestaurants();
// };map


/**
 * Use Static Google Maps
 */
function createGoogleMaps () {
  let img = document.getElementById('map'); 
  let mapWidth = img.clientWidth;
  let mapHeight = img.clientHeight;
  const markersArray = addMarkersToMap();
  let googleMapsString = `https://maps.googleapis.com/maps/api/staticmap?center=40.722216,-73.987501&zoom=11&size=600x300&scale=2&maptype=roadmap`;
  googleMapsString = googleMapsString.concat(markersArray.join("")).concat('&key=AIzaSyBh6jw1Tjsh8RzkU4e014eUosf4FWBdYTM');
  $('#map').append(`<img src='${googleMapsString}' aria-label="map">`);
}

/**
 * Update page and map for current restaurants.
 */
let updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      document.querySelector('#restaurants-list').setAttribute('aria-label', `List of Restaurants ${neighborhood? neighborhood =='all'? '': `Filtered by ${neighborhood}` : ''} ${cuisine? cuisine == 'all'? '' : `and ${cuisine}` : ''}`);
    }
  })
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
let resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
let fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  createGoogleMaps();
  // Lazy Load Images
  lazyLoader();
};

/**
 * Create restaurant HTML.
 */
let createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img lazy';
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant));
  image.setAttribute('src', ' ');
  image.alt = restaurant.name + 'restaurant';
  li.append(image);
  
  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  name.setAttribute('aria-label', `restaurant name: ${restaurant.name}`)
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  neighborhood.setAttribute('aria-label', `neighborhood: ${restaurant.neighborhood}`)
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  address.setAttribute('aria-label', `restaurant address: ${restaurant.address}`)
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('role', 'button');
  more.setAttribute('tabindex', '0');
  more.setAttribute('aria-label', `Click to navigate to ${restaurant.name} review page. restaurant address: ${restaurant.address} ${restaurant.neighborhood}. `);
  li.append(more)
  const favButton = favoriteButton(restaurant);
  li.append(favButton);

  return li
};

/**
 * Add markers for current restaurants to the map.
 */
// let addMarkersToMap = (restaurants = self.restaurants) => {
//   restaurants.forEach(restaurant => {
//     // Add marker to the map
//     const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
//     google.maps.event.addListener(marker, 'click', () => {
//       window.location.href = marker.url
//     });
//     self.markers.push(marker);
//   });
// };

let addMarkersToMap = (restaurants = self.restaurants) => {
  let markers = [];
  restaurants.forEach(restaurant => {
    markers.push(`&markers=color:red%7C${restaurant.latlng.lat},${restaurant.latlng.lng}`);
  });
  console.log(markers);
  return markers;
};

updateRestaurants();