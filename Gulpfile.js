// -----------------------------------------------------------------------------
// Plugins and variables
// -----------------------------------------------------------------------------

/**
 * Gulp plugins
 */

var gulp        = require("gulp");
var browserSync = require("browser-sync").create();
var del         = require("del");
var sass        = require("gulp-sass");
var sourcemaps  = require("gulp-sourcemaps");
var prefix      = require("gulp-autoprefixer");
var concat      = require("gulp-concat");
var rename      = require("gulp-rename");
var uglify      = require("gulp-uglify");
var deporder    = require("gulp-deporder");
var changed     = require("gulp-changed");
var imagemin    = require("gulp-imagemin");
var minifyCss   = require("gulp-minify-css");
var ghPages     = require("gulp-gh-pages");
var minifyHTML  = require("gulp-minify-html");



/**
 * Predefined filepaths to be used in the tasks
 */
var path = {
            build:{
                css: "build/assets/css/",
                js: "build/assets/js/",
                img: "build/assets/img/",
                data: "build/assets/data/",
                html: "build/"
            },
            src:{
                sass: "src/assets/scss/",
                js: "src/assets/js/",
                img: "src/assets/img/",
                data: "src/assets/data/",
                html: "src/"
            }
};

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/**
 * Pre-cleaning the build folder
 */

function clean() {
    return del([
        "build/",
    ]);
}

/**
 * Deploy to gh-pages branch! Run using 'gulp deploy'
 */
function upload() {
    return gulp.src("./build/**/*")
        .pipe(ghPages());
}

// -----------------------------------------------------------------------------
// Build tasks
// -----------------------------------------------------------------------------

/**
 * Compiles SCSS sourcefiles and outputs autoprefixed, minified CSS + sourcemaps
 */
function compileSass() {
    return gulp.src(path.src.sass + "/*.scss")

        .pipe(sourcemaps.init())
            .pipe(sass.sync())
                .on("error", sass.logError) //Log SCSS errors in console!
            .pipe(prefix(["last 2 versions", "> 1%"], { cascade: true }))
            .pipe(rename("main.min.css"))
            .pipe(minifyCss())

        .pipe(sourcemaps.write("sourcemaps"))
        .pipe(gulp.dest(path.build.css))
        //Update browser sync!
        .pipe(browserSync.stream());
}

/**
 * Combines and minifies all source JavaScript files, including sourcemaps. Dependencies and ordering is done with the deporder plugin
 */
function js() {
    return gulp.src(path.src.js + "**/*.js")
        .pipe(deporder())
        .pipe(sourcemaps.init())
            .pipe(concat("concat.js"))
            .pipe(rename("all.min.js"))
            .pipe(uglify())
        .pipe(sourcemaps.write("sourcemaps"))
        .pipe(gulp.dest(path.build.js))
        .pipe(browserSync.stream());
}

/**
 * Optimizes images for web and outputs them to build folder.
 */
function img() {
    return gulp.src(path.src.img + "*.*")
        .pipe(changed(path.build.img)) // Ignore unchanged files
        .pipe(imagemin({optimizationLevel: 5}))
        .pipe(gulp.dest(path.build.img))
        .pipe(browserSync.stream());

}

/**
 * Outputs data files to build folder
 */
function data() {
    return gulp.src(path.src.data + "*.*")
        .pipe(changed(path.build.data)) // Ignore unchanged files
        .pipe(gulp.dest(path.build.data))
        .pipe(browserSync.stream());
}

/**
 * Outputs html files to build folder
 */
function html() {
    return gulp.src([path.src.html + "*.html", path.src.html + "CNAME"])
        .pipe(changed(path.build.html)) // Ignore unchanged files
        //.pipe(minifyHTML())
        .pipe(gulp.dest(path.build.html))
        .pipe(browserSync.stream());
}

// -----------------------------------------------------------------------------
// Watch and serve tasks
// -----------------------------------------------------------------------------

/**
 * Start BrowserSync server and watch files for changes!
 */
function serve(cb) {

    //Start browsersync server!
    browserSync.init({
        server: "build/",
        port: 8000,
        https: true,
    });
    //Watch folders!
    gulp.watch(path.src.sass + "**/*.scss", gulp.series("sass"));
    gulp.watch(path.src.html + "*.html", gulp.series("html"));
    gulp.watch(path.src.js + "**/*.js", gulp.series("js"));
    cb();
}

/**
 * Outputs all files.
 */
const build = gulp.parallel(compileSass, js, img, html, data);

// export tasks
exports.clean = clean;
exports.sass = compileSass;
exports.js = js;
exports.img = img;
exports.data = data;
exports.html = html;
exports.upload = upload;
exports.build = build;

/**
 * Run tasks in specified order! (1. clean, 2. build, 3. serve and watch)
 */
exports.default = gulp.series(clean, build, serve);

/**
 * Alternative: Build, then deploy to gh-pages!
 */
exports.deploy = gulp.series(clean, build, upload);
