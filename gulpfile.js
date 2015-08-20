'use strict';
//node modules
var path = require('path');

// node_modules modules
var _ = require('lodash');
var browserify  = require("browserify");
var browserSync = require("browser-sync");
var bsreload = browserSync.reload;
var del = require('del');
var mergeStream = require('merge-stream');
var q = require('q');
var source = require('vinyl-source-stream');
var watchify = require('watchify');

// gulp modules
var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();

// kickstart modules
var assemble = require('kickstart-assemble');

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
        .pipe(plugins.cssUrlAdjuster({
            prepend: config.dest.images
        }))
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
gulp.task('copy:extras', function (done) {
    return gulp.src('./src/public/*.{ico,txt}')
        .pipe(gulp.dest(config.dest.base));
});

gulp.task('compile:templates', function(done) {
    var opts = {
        assets: config.dest.assets,
        data: config.src.data,
        production: false,
        layout: 'default-layout',
        layouts: 'src/templates/views/layouts/*.html',
        partials: {
            common: ['src/templates/views/partials/layout/**/*.{hbs,html}'],
            component: ['src/templates/views/partials/components/**/*.{hbs,html}'],
            module: ['src/templates/views/partials/modules/**/*.{hbs,html}'],
            structure: ['src/templates/views/partials/structures/**/*.{hbs,html}'],
            templates: ['src/templates/views/partials/templates/**/*.{hbs,html}']
        },
        //partials: 'src/templates/views/partials/**/*.html',
        pages: 'src/templates/views/*.html',
        dest: config.dest.base
    };

    assemble.templates(opts, done);
});

gulp.task('compile:styleguide', function(done) {
  var opts = {
    assetPath: '/public', // relative to site root directory (not styleguide)
    data: config.src.data,
    patterns: ['components', 'modules', 'structures', 'templates'],
    partials: {
        components: ['src/templates/views/partials/components/**/*.{hbs,html}'],
        modules: ['src/templates/views/partials/modules/**/*.{hbs,html}'],
        structures: ['src/templates/views/partials/structures/**/*.{hbs,html}'],
        templates: ['src/templates/views/partials/templates/**/*.{hbs,html}']
    },
    pages: 'src/templates/views/*.{hbs,html}',
    dest: 'styleguide'
  };

  assemble.styleguide(opts, done);
});

gulp.task('browserSync', function () {
    return browserSync(config.browserSync);
});

// watch task
gulp.task('watch', function () {
    // plugins.watch(config.src.html, function () {
    //     plugins.sequence('compile', function() {
    //         bsreload();
    //     });
    // });
    plugins.watch(config.src.styles, function () {
        gulp.start('styles:app')
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

// compile task
gulp.task('compile', ['compile:templates', 'compile:styleguide']);

// production build task
gulp.task('build:production', ['clean'], function (cb) {
    plugins.sequence(
        ['fonts', 'images', 'styles', 'scripts'],
        ['compile', 'copy:extras'],
        done
    );
});

gulp.task('build', ['clean'], function(done) {
    plugins.sequence(
        ['fonts', 'images', 'styles', 'scripts'],
        ['compile', 'copy:extras'],
        ['browserSync', 'watch'],
        done
    );
});

gulp.task('default', ['build']);



