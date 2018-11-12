/**
 * Returns a li element with review data so it can be appended to 
 * the review list.
 */
function createReviewHTML(review) {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.createdAt).toLocaleDateString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Clear form data
 */
function clearForm() {
  // clear form data
  document.getElementById('name').value = "";
  document.getElementById('rating').selectedIndex = 0;
  document.getElementById('comments').value = "";
}

/**
 * Make sure all form fields have a value and return data in
 * an object, so is ready for a POST request.
 */
function validateAndGetData() {
  const data = {};

  // get name
  let name = document.getElementById('name');
  if (name.value === '') {
    name.focus();
    return;
  }
  data.name = name.value;

  // get rating
  const ratingSelect = document.getElementById('rating');
  const rating = ratingSelect.options[ratingSelect.selectedIndex].value;
  if (rating == "--") {
    ratingSelect.focus();
    return;
  }
  data.rating = Number(rating);

  // get comments
  let comments = document.getElementById('comments');
  if (comments.value === "") {
    comments.focus();
    return;
  }
  data.comments = comments.value;

  // get restaurant_id
  let restaurantId = document.getElementById('review-form').dataset.restaurantId;
  data.restaurant_id = Number(restaurantId);

  // set createdAT
  data.createdAt = new Date().toISOString();

  return data;
}

/**
 * Handle submit. 
 */
function handleSubmit(e) {
  e.preventDefault();
  const review = validateAndGetData();
  if (!review) return;

  console.log('Form button submission clicked');

  let online = window.navigator.onLine;

  const url = `http://localhost:1337/reviews/`;
  const POST = {
    method: 'POST',
    body: JSON.stringify(review)
  };

  // get restaurant_id
  let restaurant_id = document.getElementById('review-form').dataset.restaurantId;
  restaurant_id = Number(restaurant_id);

  // TODO: use Background Sync to sync data with API server
  if (!navigator.serviceWorker) {
    return fetch(url, POST).then(response => {
      if (!response.ok) return Promise.reject("We couldn't post review to server.");
      return response.json();
    }).then(newNetworkReview => {
      // save new review on idb
      DBHelper.putReviews(newNetworkReview);
      // post new review on page
      const reviewList = document.getElementById('reviews-list');
      const review = createReviewHTML(newNetworkReview);
      reviewList.appendChild(review);
      // clear form
      clearForm();
      window.location.reload(true);
    });
  }
  
  // Do not make a fetch request, but instead save review to iDB, reguister
  // a background sync, and have the service worker fetch review from iDB and POST
  // data to server when a sync is triggered. 😎
  return DBHelper.idbDatabase().then(db => {
    const tx = db.transaction('offlineReviews', 'readwrite');
    const offlineReviewStore  = tx.objectStore('offlineReviews');
    offlineReviewStore.add(review);
    return tx.complete;
  }).then(() => {
    // register background sync if transaction was successful
    console.log('review saved to iDB successfully!');
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.sync.register('syncReviews');
    });
  }).then(() => {
      if(online){
        setTimeout(()=> {
          window.location.reload(true);
        }, 2000);
      }
      if(!online) { // true|false
        console.log('Submission will be made when an internet connection has been established');
        $('#offlineModal').modal();

        setTimeout(()=> {
          DBHelper.putReviews(review);
          const ul = document.getElementById('reviews-list');
          ul.appendChild(createReviewHTML(review));
          // post new review on page
          // clear form
          clearForm();
          $.modal.close();
          

        }, 2000);
      }
    }).catch(err => {
    // if review couldn't be added to offlineReview store or sync couldn't be registered
    // attempt a regular POST fetch
    console.error(err, "Attempting to POST data...");
    return fetch(url, POST);
  });
}

/**
 * Returns a form element for posting new reviews.
 */
function reviewForm(restaurantId) {
  const form = document.createElement('form');
  form.id = "review-form";
  form.dataset.restaurantId = restaurantId;

  let p = document.createElement('p');
  const name = document.createElement('input');
  name.id = "name"
  name.setAttribute('type', 'text');
  name.setAttribute('aria-label', 'Name');
  name.setAttribute('placeholder', 'Enter Your Name');
  p.appendChild(name);
  form.appendChild(p);

  p = document.createElement('p');
  const selectLabel = document.createElement('label');
  selectLabel.setAttribute('for', 'rating');
  selectLabel.innerText = "Your rating: ";
  p.appendChild(selectLabel);
  const select = document.createElement('select');
  select.id = "rating";
  select.name = "rating";
  select.classList.add('rating');
  ["--", 1,2,3,4,5].forEach(number => {
    const option = document.createElement('option');
    option.value = number;
    option.innerHTML = number;
    if (number === "--") option.selected = true;
    select.appendChild(option);
  });
  p.appendChild(select);
  form.appendChild(p);

  p = document.createElement('p');
  const textarea = document.createElement('textarea');
  textarea.id = "comments";
  textarea.setAttribute('aria-label', 'comments');
  textarea.setAttribute('placeholder', 'Enter any comments here');
  textarea.setAttribute('rows', '10');
  p.appendChild(textarea);
  form.appendChild(p);

  p = document.createElement('p');
  const addButton = document.createElement('button');
  addButton.setAttribute('type', 'submit');
  addButton.setAttribute('aria-label', 'Add Review');
  addButton.classList.add('add-review');
  addButton.innerHTML = "<span>+</span>";
  p.appendChild(addButton);
  form.appendChild(p);

  form.onsubmit = handleSubmit;

  return form;
};