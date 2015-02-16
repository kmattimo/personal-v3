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

var config = {

    dev: gutil.env.dev,

    src: {
        scripts: {
            kickstart: [
                './src/kickstart/scripts/prism.js',
                './src/kickstart/scripts/kickstart.js'
            ],
            toolkit: [
                './src/toolkit/assets/scripts/toolkit.js'
            ]
        },
        styles: {
            kickstart:'./src/kickstart/styles/kickstart.scss',
            toolkit: './src/toolkit/assets/styles/toolkit.scss'
        },
        images: {
            kickstart: './src/kickstart/images/**/*',
            toolkit: './src/toolkit/assets/images/**/*'
        },
        fonts: {
            kickstart: './src/kickstart/fonts/*',
            toolkit: './src/toolkit/assets/fonts/*'
        },
        styleguide: './src/toolkit/styleguide/*.html',
        pages: './src/toolkit/pages/*.html',
        patterns: [
            'components',
            'modules',
            'templates',
            'pages',
            'documentation'
        ]
    },

    dest: './dist',

    browsers: [
        'ie >= 8',
        'ie_mob >= 8',
        'ff >= 30',
        'chrome >= 32',
        'safari >= 6',
        'opera >= 23',
        'ios >= 6',
        'android 2.3',
        'android >= 4.3',
        'bb >= 10'
    ]
};

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
        .pipe(rename('kickstart.css'))
        .pipe(gulp.dest(config.dest + '/kickstart/styles'))
        .pipe(gulpif(config.dev, reload({stream: true})));
});

gulp.task('styles:toolkit', function() {
    return gulp.src(config.src.styles.toolkit)
        .pipe(plumber({ errorHandler: onError }))
        .pipe(sass())
        .pipe(gulpif(!config.dev, combinemq()))
        .pipe(autoprefix(config.browsers))
        .pipe(gulpif(!config.dev, csso()))
        .pipe(gulp.dest(config.dest + '/toolkit/styles'))
        .pipe(gulpif(config.dev, reload({stream: true})));
});

gulp.task('styles', ['styles:kickstart','styles:toolkit']);

// scripts
gulp.task('scripts:kickstart', function() {
    return gulp.src(config.src.scripts.kickstart)
        .pipe(concat('kickstart.js'))
        .pipe(gulpif(!config.dev, uglify()))
        .pipe(gulp.dest(config.dest + '/kickstart/scripts'));
});

gulp.task('scripts:toolkit', function() {
    return browserify(config.src.scripts.toolkit)
        .bundle()
        .on('error', onError)
        .pipe(source('toolkit.js'))
        .pipe(gulpif(!config.dev, streamify(uglify())))
        .pipe(gulp.dest(config.dest + '/toolkit/scripts'));
});

gulp.task('scripts', ['scripts:kickstart','scripts:toolkit']);

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

gulp.task('images:toolkit', ['favicon'], function() {
    return gulp.src(config.src.images.toolkit)
        .pipe(gulpif(!config.dev, imagemin({
            progressive: true, // 1
            optimizationLevel: 3, // 2
            svgoPlugins: [
                { removeViewBox: false },               // 3a
                { removeUselessStrokeAndFill: false },  // 3b
                { removeEmptyAttrs: false }             // 3c
            ]
        })))
        .pipe(gulp.dest(config.dest + '/toolkit/images'));
});

gulp.task('images', ['images:kickstart','images:toolkit']);

// fonts
gulp.task('fonts:kickstart', function() {
    return gulp.src(config.src.fonts.kickstart)
        .pipe(gulp.dest(config.dest + '/kickstart/fonts'));
});

gulp.task('fonts:toolkit', function() {
    return gulp.src(config.src.fonts.toolkit)
        .pipe(gulp.dest(config.dest + '/toolkit/fonts'));
});

gulp.task('fonts', ['fonts:kickstart','fonts:toolkit']);

// extras
gulp.task('favicon', function() {
    return gulp.src('./src/favicon.ico')
        .pipe(gulp.dest(config.dest));
});

// collate
gulp.task('collate', function() {

    var deferred, opts;

    deferred = q.defer();
    opts = {
        base: 'src/toolkit',
        patterns: config.src.patterns,
        dest: config.dest + '/kickstart/data/kickstart-data.json'
    };

    collate(opts, deferred.resolve);

    return deferred.promise;
});

// build
gulp.task('build:kickstart', function() {

    var opts = {
        data: config.dest + '/kickstart/data/kickstart-data.json',
        template: false
    };

    return gulp.src(config.src.styleguide)
        .pipe(compile(opts))
        .pipe(gulp.dest(config.dest));
});

gulp.task('build:toolkit', function() {
    var opts = {
        data: config.dest + '/kickstart/data/kickstart-data.json',
        template: true
    };

    return gulp.src(['./src/toolkit/templates/*.html', './src/toolkit/pages/*.html'])
        .pipe(compile(opts))
        .pipe(gulp.dest(config.dest));
});

gulp.task('build', ['collate'], function() {
    gulp.start('build:kickstart', 'build:toolkit');
});

// server
gulp.task('browser-sync', function() {
    browserSync({
        server: {
            baseDir: config.dest
        },
        notify: false,
        logPrefix: 'KICKSTART'
    });
});

// watch
gulp.task('watch', ['browser-sync'], function() {
    gulp.watch('src/toolkit/**/*.{html,md}', ['build',reload]);
    gulp.watch('src/kickstart/styles/**/*.{sass,scss}', ['styles:kickstart']);
    gulp.watch('src/toolkit/assets/styles/**/*.{sass,scss}', ['styles:toolkit']);
    gulp.watch('src/kickstart/scripts/**/*.js', ['scripts:kickstart', reload]);
    gulp.watch('src/toolkit/assets/scripts/**/*.js', ['scripts:toolkit', reload]);
    gulp.watch(config.src.images.toolkit, ['images:toolkit', reload]);
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
        if (config.dev) {
            gulp.start('watch');
        }
    });
});




