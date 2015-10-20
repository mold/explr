var gulp        = require('gulp');
var browserSync = require('browser-sync').create();
var sass        = require('gulp-sass');
var sourcemaps  = require('gulp-sourcemaps');
var prefix      = require('gulp-autoprefixer');
var gp_concat   = require('gulp-concat');
var gp_rename   = require('gulp-rename');
var gp_uglify   = require('gulp-uglify');


var path = {
    sass: 'new/app/scss/',
    js: 'new/app/js/',
    css: 'new/app/css/'
}

// Static Server + watching scss/html/js files
gulp.task('serve', ['sass', 'js'], function() {

    browserSync.init({
        server: "./",
        port: 8000
    });

    gulp.watch(path.sass + "**/*.scss", ['sass']);
    gulp.watch("*.html").on('change', browserSync.reload);
    gulp.watch(path.js + "*.js").on('change', browserSync.reload);

});

// Compile sass into CSS & auto-inject into browsers
gulp.task('sass', function() {
    return gulp.src(path.sass + "/*.scss")
    
        .pipe(sourcemaps.init())
            .pipe(sass.sync().on('error', sass.logError))
            .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))

        .pipe(sourcemaps.write("sourcemaps"))
        .pipe(gulp.dest(path.css))
        //Update browser sync!
        .pipe(browserSync.stream());
});

//Concat and minify javascript
gulp.task('js', function(){
    return gulp.src([
                        path.js + "api/*.js",
                        path.js + "script.js",
                        path.js + "map.js",
                        path.js + "helpers.js",
                        path.js + "theme.js",
                        path.js + "screenshot.js"
                    ])
        .pipe(sourcemaps.init())
            .pipe(gp_concat('concat.js'))
            //.pipe(gulp.dest(path.js))
            .pipe(gp_rename('all.min.js'))
            .pipe(gp_uglify())
        .pipe(sourcemaps.write("sourcemaps"))
        .pipe(gulp.dest(path.js))
        .pipe(browserSync.stream());

});


//Run tasks!
gulp.task('default', ['serve']);