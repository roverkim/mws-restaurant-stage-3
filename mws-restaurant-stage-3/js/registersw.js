// /* Service Worker */
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('sw.js').then(function(reg) {
    console.log('service worker registered.')
  }).catch((err) => {
    console.log('problem registering service worker');
    console.log(err);
  });
}
