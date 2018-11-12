let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
// window.initMap = () => {
//   fetchRestaurantFromURL((error, restaurant) => {
//     if (error) { // Got an error!
//       console.error(error);
//     } else {
//       self.map = new google.maps.Map(document.getElementById('map'), {
//         zoom: 16,
//         center: restaurant.latlng,
//         scrollwheel: false
//       });
//       fillBreadcrumb();
//       DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
//     }
//   });
// }

let addMarkersToMap = (restaurant = self.restaurant) => {
  return `&markers=color:red%7C${restaurant.latlng.lat},${restaurant.latlng.lng}`;
};

/**
 * Use Static Google Maps
 */
function createGoogleMaps() {
  let img = document.getElementById('map'); 
  let mapWidth = img.clientWidth;
  let mapHeight = img.clientHeight;
  const marker = addMarkersToMap();
  let googleMapsString = `https://maps.googleapis.com/maps/api/staticmap?center=40.722216,-73.987501&zoom=11&size=1000x300&scale=2&maptype=roadmap`;
  googleMapsString = googleMapsString.concat(marker).concat('&key=AIzaSyBh6jw1Tjsh8RzkU4e014eUosf4FWBdYTM');
  $('#map').append(`<img src='${googleMapsString}' aria-label="map">`);
}


let initializeGoogleMaps = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    console.log(restaurant);
    if (error) { // Got an error!
      console.error(error);
    } else {
      createGoogleMaps(restaurant);
      fillBreadcrumb();
    }
  });
}


/**
 * Get current restaurant from page URL.
 */
let fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      console.log(restaurant);
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
let fillRestaurantHTML = (restaurant = self.restaurant) => {
  console.log('filling filling html');
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;
  name.setAttribute('aria-label', `restaurant name: ${restaurant.name}`)

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;
  address.setAttribute('aria-label', `restaurant address: ${restaurant.address}`)

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img lazy'
  image.alt = restaurant.name
  // image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute('src', ' ');
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant));

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
  cuisine.setAttribute('aria-label', `cuisine type: ${restaurant.cuisine_type}`);

  const favButtonContainer = document.getElementById('fav-button-container');
  favButtonContainer.append( favoriteButton(restaurant) );

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  // console.log(restaurant);  
  // fill reviews
  DBHelper.fetchReviewsByRestaurantId(restaurant.id).then(reviews => fillReviewsHTML(reviews));
  lazyLoader();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
let fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
const hours = document.getElementById('restaurant-hours');
  let openingHours = [];
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);

    openingHours.push(`${key} ${operatingHours[key]} `);
  }
  // console.log(openingHours);
  hours.setAttribute('aria-label', `Restaruant Hours ${openingHours.join('. ').replace(/-/g, 'to')}`);
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
let fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);

  const h3 = document.createElement('h3');
  h3.innerHTML = "Leave a Review";
  container.appendChild(h3);
  const id = getParameterByName('id');
  container.appendChild(reviewForm(id));
}

/**
 * Create review HTML and add it to the webpage.
 */
let createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.createdAt).toLocaleDateString();
  date.setAttribute('tabindex', '0');
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.setAttribute('tabindex', '0');
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.setAttribute('tabindex', '0');
  li.appendChild(comments);
  li.setAttribute('aria-label', `review by ${review.name}`);
  li.setAttribute('tabindex', '0');

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
let fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
let getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}


initializeGoogleMaps();