'use strict';

// gulp modules
var autoprefix  = require('gulp-autoprefixer'),
    browserify  = require("browserify"),
    browserSync = require("browser-sync"),
    collate     = require('./tasks/collate'),
    combinemq   = require('gulp-combine-media-queries'),
    compile     = require('./tasks/compile'),
    concat      = require('gulp-concat'),
    csso        = require('gulp-csso'),
    del         = require('del'),
    gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    gulpif      = require('gulp-if'),
    imagemin    = require('gulp-imagemin'),
    plumber     = require('gulp-plumber'),
    q           = require('q'),
    rename      = require('gulp-rename'),
    reload      = browserSync.reload,
    runSequence = require('run-sequence'),
    sass        = require('gulp-sass'),
    source      = require('vinyl-source-stream'),
    streamify   = require('gulp-streamify'),
    uglify      = require('gulp-uglify');

var config = require('./config.json');

// [1] plumber prevents the node process from stopping
//      when an error is thrown, but it stops any file change
//      monitoring. If we emit the 'end' event
//      the process continues to listen for changes, allowing us
//      to correct our file(s) and return the app to a normal state
function onError(err) {
    gutil.beep(); // make some noise
    gutil.log(gutil.colors.red(err)); // emit the error to the console

    this.emit('end'); // 1
}

// clean destination files
gulp.task('clean', function(callback) {
    del([config.dest], callback);
});

// styles
gulp.task('styles:kickstart', function() {
    return gulp.src(config.src.styles.kickstart)
        .pipe(plumber({errorHandler: onError}))
        .pipe(sass())
        .pipe(gulpif(!config.dev, combinemq()))
        .pipe(autoprefix(config.browsers))
        .pipe(gulpif(!config.dev, csso()))
        .pipe(rename('styleguide.css'))
        .pipe(gulp.dest(config.dest + '/kickstart/styles'))
        .pipe(gulpif(config.dev, reload({stream: true})));
});

gulp.task('styles:app', function() {
    return gulp.src(config.src.styles.app)
        .pipe(plumber({ errorHandler: onError }))
        .pipe(sass())
        .pipe(gulpif(!config.dev, combinemq()))
        .pipe(autoprefix(config.browsers))
        .pipe(gulpif(!config.dev, csso()))
        .pipe(gulp.dest(config.dest + '/app/styles'))
        .pipe(gulpif(config.dev, reload({stream: true})));
});

gulp.task('styles', ['styles:kickstart','styles:app']);

// scripts
gulp.task('scripts:kickstart', function() {
    return gulp.src(config.src.scripts.kickstart)
        //.pipe(concat('styleguide.js'))
        .pipe(gulpif(!config.dev, uglify()))
        .pipe(gulp.dest(config.dest + '/kickstart/scripts'));
});

gulp.task('scripts:app', function() {
    return browserify(config.src.scripts.app)
        .bundle()
        .on('error', onError)
        .pipe(source('main.js'))
        .pipe(gulpif(!config.dev, streamify(uglify())))
        .pipe(gulp.dest(config.dest + '/app/scripts'));
});

gulp.task('scripts', ['scripts:kickstart','scripts:app']);

// images
//
// [1] lossless conversion to progressive
// [2] most effective according to OptiPNG
// [3a] don't remove the viewbox atribute from the SVG
// [3b] don't remove Useless Strokes and Fills
// [3c] don't remove Empty Attributes from the SVG

gulp.task('images:kickstart', function() {
    return gulp.src(config.src.images.kickstart)
        .pipe(imagemin({
            progressive: true,
            optimizationLevel: 3,
            svgoPlugins: [
                { removeViewBox: false },               // 3a
                { removeUselessStrokeAndFill: false },  // 3b
                { removeEmptyAttrs: false }             // 3c
            ]
        }))
        .pipe(gulp.dest(config.dest + '/kickstart/images'))
});

gulp.task('images:app', ['favicon'], function() {
    return gulp.src(config.src.images.app)
        .pipe(gulpif(!config.dev, imagemin({
            progressive: true, // 1
            optimizationLevel: 3, // 2
            svgoPlugins: [
                { removeViewBox: false },               // 3a
                { removeUselessStrokeAndFill: false },  // 3b
                { removeEmptyAttrs: false }             // 3c
            ]
        })))
        .pipe(gulp.dest(config.dest + '/app/images'));
});

gulp.task('images', ['images:kickstart','images:app']);

// fonts
gulp.task('fonts:kickstart', function() {
    return gulp.src(config.src.fonts.kickstart)
        .pipe(gulp.dest(config.dest + '/kickstart/fonts'));
});

gulp.task('fonts:app', function() {
    return gulp.src(config.src.fonts.app)
        .pipe(gulp.dest(config.dest + '/app/fonts'));
});

gulp.task('fonts', ['fonts:kickstart','fonts:app']);

// extras
gulp.task('favicon', function() {
    return gulp.src('./src/favicon.ico')
        .pipe(gulp.dest(config.dest));
});

// collate
gulp.task('collate', function() {
    var deferred = q.defer();
    var options = {
            patterns: config.src.patterns,
            dest: config.dest + '/kickstart/data/styleguide-data.json',
            debug: false,
            logErrors: true,
            logVerbose: true
        };

    collate(options, deferred.resolve);

    return deferred.promise;
});

gulp.task('build:patterns', function() {
    var
        deferred = q.defer(),
        opts = {
            data: config.dest + '/kickstart/data/styleguide-data.json',
            template: true
        };

    compile(opts, deferred.resolve);

    return deferred.promise;
});

// build
gulp.task('build:kickstart', function() {

    var opts = {
        data: config.dest + '/kickstart/data/styleguide-data.json',
        template: false
    };

    return gulp.src(config.src.styleguide)
        .pipe(compile(opts))
        .pipe(gulp.dest(config.dest));
});

gulp.task('build:app', function() {
    var opts = {
        data: config.dest + '/kickstart/data/styleguide-data.json',
        template: true
    };

    return gulp.src(['./src/app/templates/*.html', './src/app/pages/*.html'])
        .pipe(compile(opts))
        .pipe(gulp.dest(config.dest));
});

gulp.task('build', ['collate'], function() {
    //gulp.start('build:kickstart', 'build:patterns');
    gulp.start('build:patterns');
});

// server
gulp.task('browser-sync', function() {
    browserSync({
        server: {
            baseDir: config.dest
        },
        browsers: ['chrome'],
        notify: false,
        logPrefix: 'KICKSTART'
    });
});

// watch
gulp.task('watch', ['browser-sync'], function() {
    gulp.watch('src/app/**/*.{html,md}', ['build',reload]);
    gulp.watch('src/kickstart/assets/styles/**/*.{sass,scss}', ['styles:kickstart']);
    gulp.watch('src/app/assets/styles/**/*.{sass,scss}', ['styles:app']);
    gulp.watch('src/kickstart/assets/scripts/**/*.js', ['scripts:kickstart', reload]);
    gulp.watch('src/app/assets/scripts/**/*.js', ['scripts:app', reload]);
    gulp.watch(config.src.images.app, ['images:app', reload]);
});

// default build task
gulp.task('default', ['clean'], function() {
    var tasks = [
        'styles',
        'scripts',
        'images',
        'fonts',
        'build'
    ];

    // build in sequence order
    runSequence(tasks, function() {
        if (!config.dev) {
            gulp.start('watch');
        }
    });
});




