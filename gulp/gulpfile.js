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
function styles() {
  return gulp.src([
    '../server/component/**/css/*.css',
    '../server/component/style/css/*.css',
    '../server/component/style/**/css/*.css'
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
