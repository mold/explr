var gulp        = require('gulp');
var browserSync = require('browser-sync').create();
var sass        = require('gulp-sass');
var sourcemaps  = require('gulp-sourcemaps');
var prefix      = require('gulp-autoprefixer');
var concat      = require('gulp-concat');
var rename      = require('gulp-rename');
var uglify      = require('gulp-uglify');
var deporder    = require('gulp-deporder');
var clean       = require('gulp-clean');
var changed     = require('gulp-changed');
var imagemin = require('gulp-imagemin');
var runSequence = require('run-sequence');


var path = {
            build:{
                css: 'build/assets/css/',
                js: 'build/assets/js/',
                img: 'build/assets/img/',
                data: 'build/assets/data/',
                html: 'build/'
            },
            src:{
                sass: 'src/assets/scss/',
                js: 'src/assets/js/',
                img: 'src/assets/img/',
                data: 'src/assets/data/',
                html: 'src/'
            }
};

gulp.task('clean', function() {
    return gulp.src('build/', {read: false})
        .pipe(clean())
    ;
});

// Start Server + watching scss/html/js files
gulp.task('serve', function() {

    //Start browsersync server!
    browserSync.init({
        server: "build/",
        port: 8000
    });
    //Watch folders!
    gulp.watch(path.src.sass + "**/*.scss", ['sass']);
    gulp.watch(path.src.html + '*.html', ['html']);

    //gulp.watch("build/*.html").on('change', browserSync.reload);
    gulp.watch(path.src.js + "*.js", ['js']);
});

// Compile sass into CSS & auto-inject into browsers
gulp.task('sass', function() {
    return gulp.src(path.src.sass + "/*.scss")
    
        .pipe(sourcemaps.init())
            .pipe(sass.sync().on('error', sass.logError))
            .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))

        .pipe(sourcemaps.write("sourcemaps"))
        .pipe(gulp.dest(path.build.css))
        //Update browser sync!
        .pipe(browserSync.stream());
});

//Concat and minify javascript
gulp.task('js', function(){
    return gulp.src(path.src.js + '**/*.js')
        .pipe(deporder())
        .pipe(sourcemaps.init())
            .pipe(concat('concat.js'))
            .pipe(rename('all.min.js'))
            .pipe(uglify())
        .pipe(sourcemaps.write("sourcemaps"))
        .pipe(gulp.dest(path.build.js))
        .pipe(browserSync.stream());
});

//Optimize images
gulp.task('img', function() {
  return gulp.src(path.src.img + '*.*')
    .pipe(changed(path.build.img)) // Ignore unchanged files
    .pipe(imagemin({optimizationLevel: 5}))
    .pipe(gulp.dest(path.build.img))
    .pipe(browserSync.stream());

});

gulp.task('data', function() {
  return gulp.src(path.src.data + '*.*')
    .pipe(changed(path.build.data)) // Ignore unchanged files
    .pipe(gulp.dest(path.build.data))
    .pipe(browserSync.stream());

});

gulp.task('html', function() {
  return gulp.src(path.src.html + '*.html')
    .pipe(changed(path.build.html)) // Ignore unchanged files
    .pipe(gulp.dest(path.build.html))
    .pipe(browserSync.stream());

});

//Run tasks!
gulp.task('default', function() {
    runSequence(
        'clean',
        ['sass', 'js', 'img', 'html', 'data'],
        'serve'
    );
});