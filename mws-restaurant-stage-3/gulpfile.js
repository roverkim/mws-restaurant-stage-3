const gulp = require('gulp'); // Task runner
// Minfication
const concat = require('gulp-concat'); // Join files together
const uglify = require("gulp-uglify-es").default; // Minmizes files
const autoprefixer = require('gulp-autoprefixer'); // Adds Auto Prefix for CSS styles such as webkits in css
const cleanCSS = require('gulp-clean-css');
const gzip = require('gulp-gzip');
const compress = require('compression'); // browserSync Gzip Support
// Sever
const browserSync = require('browser-sync').create();
// Transpiler
const babel = require('gulp-babel'); // Transform latest ES code to ES5

// const browserify = require("browserify"); // Allows for require to be used in browser files
// const source = require("vinyl-source-stream"); // Convert to vinyl streams for browserify
// const buffer = require("vinyl-buffer"); // Convery vinyl streams to buffered object

// Utlilities
const sourcemaps = require('gulp-sourcemaps'); // Creates a source map for minimized code that points back to the preminized version
const gutil = require('gulp-util');
const order = require('gulp-order');

// Images
const imagemin = require('gulp-imagemin'); // Minify images
const imageminPngquant = require('imagemin-pngquant'); // Quantization algorithm for images
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminWebp = require('imagemin-webp');

//gulp gulp-concat gulp-uglify-es browser-sync gulp-babel gulp-sourcemaps gulp-util gulp-order gulp-imagemin imagemin-pngquant
// let indexJs = ['js/jquery.js', 'js/jquery.modal.js', 'js/registersw.js', 'js/lazyloader.js', 'js/favorite-button.js', 'js/idb.js', 'js/dbhelper.js', 'js/main.js'];
// let restaurantJs = ['js/jquery.js','js/jquery.modal.js', 'js/registersw.js', 'js/lazyloader.js', 'js/dbhelper.js', 'js/favorite-button.js', 'js/review-form.js', 'js/idb.js', 'js/restaurant_info.js'];

let jquery = ['js/jquery.js'];
let jqueryModal = ['js/jquery.modal.js'];
let register = ['js/registersw.js'];
let lazy = ['js/lazyloader.js'];
let fav = ['js/favorite-button.js'];
let idb = ['js/idb.js'];
let dbHelper = ['js/dbhelper.js'];
let reviewform = ['js/review-form.js'];
let main = ['js/main.js'];
let restaurantJs = ['js/restaurant_info.js'];


function distribute(sourceArray, fileName, dest) {
  return gulp.src(sourceArray)
    .pipe(order(sourceArray))
    .pipe(babel({
      presets: ['@babel/env']
    })) // Transpiler ES6 Code to ES5
    .pipe(sourcemaps.init()) // Initialize Source Map
    .pipe(concat(fileName+'.js')) // Concatinate Javascript
    .pipe(uglify())
    .pipe(gzip())
    .on('error', function(err) {
      gutil.log(gutil.colors.red('[Error]'), err.toString());
    })
    .pipe(sourcemaps.write()) // Write to Source Map
    .pipe(gulp.dest(dest));
};

gulp.task('copyCSS', () => {
  return gulp.src('css/**/*.css')
    .pipe(sourcemaps.init()) // Initialize Source Map
      .pipe(autoprefixer({
        browsers: ['last 2 versions']
        })
      )
        .pipe(cleanCSS())
          .pipe(sourcemaps.write()) // Write to Source Map
           .pipe(gzip())
            .pipe(gulp.dest('dist/css'));
});

gulp.task('jquery', () => {
  return distribute(jquery, 'jquery', 'dist/js');
});
gulp.task('jqueryModal', () => {
  return distribute(jqueryModal, 'jqueryModal', 'dist/js');
});
gulp.task('register', () => {
  return distribute(register, 'register', 'dist/js');
});
gulp.task('lazy', () => {
  return distribute(lazy, 'lazy', 'dist/js');
});
gulp.task('fav', () => {
  return distribute(fav, 'fav', 'dist/js');
});
gulp.task('idb', () => {
  return distribute(idb, 'idb', 'dist/js');
});
gulp.task('dbHelper', () => {
  return distribute(dbHelper, 'dbHelper', 'dist/js');
});
gulp.task('reviewform', () => {
  return distribute(reviewform, 'reviewform', 'dist/js');
});
gulp.task('main', () => {
  return distribute(main, 'main', 'dist/js');
});
gulp.task('restaurantJs', () => {
  return distribute(restaurantJs, 'restaurantJs', 'dist/js');
});


// Task for copying files
gulp.task('copyHtml', () => { // Copy html file into the distribition folder
  return gulp.src('./*.html')
    .pipe(gzip())
      .pipe(gulp.dest('./dist'));
});

gulp.task('copyManifestSW', () => { // Copy html file into the distribition folder
  return gulp.src(['./site.webmanifest', './sw.js', './browserconfig.xml'])
    .pipe(gulp.dest('./dist'));
});

gulp.task('copyData', () => { // Copy html file into the distribition folder
  return gulp.src('data/*')
    .pipe(gulp.dest('./dist/data'))
      .pipe(browserSync.reload({
            stream: true
      }));
});

gulp.task('copyImages', () => { // Copy all image file into the distribition image folder
  return gulp.src('img/*')
  .pipe(imagemin([ imageminWebp({quality: 85})]))
    .pipe(gulp.dest('./dist/img'));
});

gulp.task('copyFonts', () => { // Copy all image file into the distribition image folder
  return gulp.src('fonts/*')
    .pipe(gulp.dest('./dist/fonts'));
});

gulp.task('default', gulp.series(['jquery', 'jqueryModal', 'register', 'lazy', 'fav', 'idb', 'dbHelper','reviewform', 'main','restaurantJs','copyManifestSW', 'copyFonts', 'copyImages', 'copyHtml', 'copyCSS', 'copyData']));

// gulp.task('watching', function(){
//   browserSync.init({
//     server: {
//       baseDir: './dist',
//       middleware: [compress()]
//     }
//   });

//   gulp.watch('./js/*.js', gulp.series(['indexJs', 'restaurantJs', 'idbJs', 'dbhelper', 'copyManifestSW', 'copyFonts', 'copyImages', 'copyHtml', 'copyCSS', 'copyData']));
//   gulp.watch('./sw.js', gulp.series(['indexJs', 'restaurantJs', 'idbJs', 'dbhelper', 'copyManifestSW', 'copyFonts', 'copyImages', 'copyHtml', 'copyCSS', 'copyData']));
//   gulp.watch('./*.html', gulp.series(['indexJs', 'restaurantJs', 'idbJs', 'dbhelper','copyManifestSW', 'copyFonts', 'copyImages', 'copyHtml', 'copyCSS', 'copyData']));
//   gulp.watch('./css/*.css', gulp.series(['indexJs', 'restaurantJs', 'idbJs', 'dbhelper','copyManifestSW', 'copyFonts', 'copyImages', 'copyHtml', 'copyCSS', 'copyData']));
// });


// gulp.task('default', gulp.series(['indexJs', 'restaurantJs','idbJs', 'dbhelper','copyManifestSW', 'copyFonts', 'copyImages', 'copyHtml', 'copyCSS', 'copyData']));
