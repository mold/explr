var gulp        = require('gulp');
var browserSync = require('browser-sync').create();
var sass        = require('gulp-sass');
var sourcemaps  = require('gulp-sourcemaps');
var prefix      = require('gulp-autoprefixer');


// Static Server + watching scss/html/js files
gulp.task('serve', ['sass'], function() {

    browserSync.init({
        server: "./",
        port: 8000
    });

    gulp.watch("new/app/scss/**/*.scss", ['sass']);
    gulp.watch("*.html").on('change', browserSync.reload);
    gulp.watch("new/app/js/*.js").on('change', browserSync.reload);

});

// Compile sass into CSS & auto-inject into browsers
gulp.task('sass', function() {
    return gulp.src("new/app/scss/*.scss")
    
        .pipe(sourcemaps.init())
            .pipe(sass.sync().on('error', sass.logError))
            .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))

        .pipe(sourcemaps.write("maps"))
        .pipe(gulp.dest("new/app/css"))
        .pipe(browserSync.stream());
});
//Run tasks!
gulp.task('default', ['serve']);