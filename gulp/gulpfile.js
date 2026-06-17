const gulp = require('gulp');
const del = require('del');
const csso = require('gulp-csso');
const concat = require('gulp-concat');
const htmlmin = require('gulp-htmlmin');
const terser = require('gulp-terser');
const babel = require('gulp-babel');

// Clean output directory
function clean() {
  return del(['dist']);
}

// Minify and concat CSS
// IMPORTANT: leaflet.css (vendored, v1.4.11+) is excluded from the bundle
// because it contains `url(images/...)` references that must resolve
// relative to the CSS file's own location on disk. Concatenating it into
// `css/ext/survey-js.min.css` would break the marker / layer-control
// images, so leaflet.css is loaded separately in both DEBUG and
// production modes from `server/component/style/surveyJS/css/leaflet.css`.
function styles() {
  return gulp.src([
    '../server/component/**/css/*.css',
    '../server/component/style/css/*.css',
    '../server/component/style/**/css/*.css',
    '!../server/component/style/surveyJS/css/leaflet.css',
    // '!../server/component/style/surveyJS/css/modern.min.css',    // v1 theme — excluded; survey-core.min.css (same dir) is the v2 replacement already picked up by the glob above
    // '!../server/component/style/surveyJS/css/defaultV2.min.css'  // v1 theme — excluded for the same reason
  ])
    .pipe(csso())
    .pipe(concat('survey-js.min.css'))
    .pipe(gulp.dest('../css/ext'));
}

// Define default task
exports.default = gulp.series(
  clean,
  styles
);
