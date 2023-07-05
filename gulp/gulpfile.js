var del = require('del');
var csso = require('gulp-csso');
var concat = require('gulp-concat');
var gulp = require('gulp');
var htmlmin = require('gulp-htmlmin');
var runSequence = require('run-sequence');
var terser = require('gulp-terser');
var babel = require('gulp-babel');

// Gulp task to minify CSS files
gulp.task('styles', function () {
    return gulp.src([
        '../server/component/**/css/*.css',
        '../server/component/style/css/*.css',
        '../server/component/style/**/css/*.css'])
        // Minify the file
        .pipe(csso())
        // Concat
        .pipe(concat('survey-js.min.css'))
        // Output
        .pipe(gulp.dest('../css/ext'))
});


// Clean output directory
gulp.task('clean', () => del(['dist']));

// Gulp task to minify all files
gulp.task('default', gulp.series('clean', 'styles', function (done) {
    done();
}));
