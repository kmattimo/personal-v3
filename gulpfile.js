'use strict';

// node modules
var _ = require('lodash');
var browserify  = require("browserify");
var browserSync = require("browser-sync");
var bsreload = browserSync.reload;
var buffer = require('vinyl-buffer');
var del = require('del');
var fs = require('fs-extra');
var mergeStream = require('merge-stream');
var path = require('path');
var q = require('q');
var source = require('vinyl-source-stream');
var watchify = require('watchify');

// gulp modules
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

// kickstart modules
var kickstart = require('kickstart-compiler');
var styleguide = require('kickstart-styleguide');

// user project configuration
var config = require('./config.js');

// error handler
var onError = function (err, cb) {
    plugins.util.beep();
    plugins.util.log(plugins.util.colors.red(err));

    if (typeof this.emit === 'function') this.emit('end');
};

// clean task
gulp.task('clean', function (cb) {
    del([
        config.dest.base
    ], cb);
});

// styles task
gulp.task('styles', function () {
    return gulp.src(config.src.styles)
        .pipe(plugins.plumber({ errorHandler: onError }))
        .pipe(plugins.sass(config.sass.settings))
        .pipe(plugins.if(!config.dev, plugins.combineMediaQueries()))
        .pipe(plugins.autoprefixer(config.sass.autoprefixer))
        .pipe(plugins.if(!config.dev, plugins.csso()))
        .pipe(gulp.dest(config.dest.styles))
        .pipe(plugins.if(config.dev, bsreload({ stream: true })));
});

// scripts task
gulp.task('scripts', function () {

    var browserifyTask = function () {

        var browserifyThis = function (bundleConfig) {
            if (config.dev) {
                _.extend(config.src.scriptBundles, watchify.args, { debug: true });

                bundleConfig = _.omit(bundleConfig, ['external', 'require']);
            }

            var b = browserify(bundleConfig);

            var bundle = function () {

                return b
                    .bundle()
                    .on('error', onError)
                    .pipe(source(bundleConfig.outputName))
                    .pipe(gulp.dest(bundleConfig.dest))
                    .pipe(plugins.if(config.dev, bsreload({ stream: true })));
            };

            if (config.dev) {
                b = watchify(b);
                b.on('update', bundle);
            } else {
                if (bundleConfig.require) b.require(bundleConfig.require);
                if (bundleConfig.external) b.external(bundleConfig.external);
            }

            return bundle();
        };

        return mergeStream.apply(gulp, _.map(config.scriptBundles, browserifyThis));

    }

    return browserifyTask();

});

// images task
gulp.task('images', function () {
    return gulp.src(config.src.images)
        .pipe(plugins.changed(config.dest.images))
        .pipe(plugins.if(!config.dev, plugins.imagemin(config.images)))
        .pipe(gulp.dest(config.dest.images))
        .pipe(plugins.if(config.dev, bsreload({ stream: true })));
});

// fonts task
gulp.task('fonts', function () {
    return gulp.src(config.src.fonts)
        .pipe(gulp.dest(config.dest.fonts));
});

// copy extra files task
gulp.task('copy:extras', function () {
    return gulp.src('./src/app/extras/**/*')
        .pipe(gulp.dest(config.dest.app));
});


// compile patterns task
gulp.task('compile', function () {
    var deferred = q.defer();
    var options = {
        patterns: config.src.patterns,
        docs: config.src.docs,
        dest: config.dest.app,
        logErrors: config.logging.logErrors,
        logToFile: config.logging.writeToFile,
        logVerbose: config.logging.verbose
    };

    kickstart(options, deferred.resolve);

    return deferred.promise;
});

// gulp.task('styleguide', function() {
//     styleguide({
//         components: path.resolve(__dirname, 'src/app/patterns'),
//         ext: 'html',
//         data: path.resolve(__dirname, 'public/app/_data'),
//         static: path.resolve(__dirname, 'public/app'),
//         staticPath: '/public/app/assets',
//         stylesheets:['styles/main.css'],
//         scripts: ['scripts/main.js'],
//         port: 3002
//     });
// });

gulp.task('browserSync', ['nodemon'], function () {
    //return browserSync(config.browserSync);
    return browserSync.init(null, config.browserSync);
});

// nodemon task for styleguid app
gulp.task('nodemon', function(done) {
    var started = false;

    plugins.nodemon({
        script: 'app.js'
    }).on('start', function() {
        if (!started) {
            done();
            started = true;
        }
    })
});

// watch task
gulp.task('watch', function () {
    plugins.watch(config.src.html, function () {
        plugins.sequence('compile', function() {
            bsreload();
        });
    });

    plugins.watch('./src/styleguide/assets/styles/**/*.{sass,scss}', function () {
        gulp.start('styles:styleguide')
    });

    plugins.watch(config.src.styles, function () {
        gulp.start('styles:app')
    });

    plugins.watch('./src/styleguide/assets/scripts/**/*.js', function () {
        gulp.start('scripts:styleguide')
    });

    plugins.watch(config.src.images, function () {
        gulp.start('images:app')
    });
});

// test performance task
gulp.task('test:performance', function () {
    //TODO: write the performance tasks
});

// performance task entry point
gulp.task('perf', ['test:performance']);

// production build task
gulp.task('build:production', ['clean'], function (cb) {
    plugins.sequence(
        ['fonts', 'images', 'styles', 'scripts'],
        ['compile', 'copy:extras'],
        done
    );
});

//default task
// gulp.task('default', ['clean'], function(done) {
//     plugins.sequence(
//         ['fonts', 'images', 'styles', 'scripts'],
//         ['compile', 'copy:extras'],
//         ['browserSync', 'watch'],
//         'styleguide',
//         done
//     );
// });
gulp.task('default', ['clean'], function(done) {
    plugins.sequence(
        ['fonts', 'images', 'styles', 'scripts'],
        ['compile', 'copy:extras'],
        ['browserSync', 'watch'],
        done
    );
});



