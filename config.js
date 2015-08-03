var path = require('path');
// source directories
var srcDir = './src';
var srcAppDir = srcDir + '/app';
var srcAssetsDir = srcAppDir + '/assets';

// destination directories
var publicDir = './public';
var publicAppDir = publicDir + '/app';
var publicAssetsDir = publicAppDir + '/assets';

module.exports = {

  dev: true, // gutil.env.dev

  logging: {
    logErrors: true,
    writeToFile: false,
    verbose: true
  },

  src: {
    app: srcAppDir,
    data: srcAppDir + '/_data/**/*.{json,yaml}',
    html: srcDir + '/**/*.{hbs,html}',
    scripts: srcAssetsDir + '/scripts/**/*.{js,jsx}',
    styles: srcAssetsDir + '/styles/**/*.{sass,scss}',
    images: srcAssetsDir + '/images/**/*.{gif,jpg,jpeg,png,svg,tiff}',
    fonts: srcAssetsDir + '/fonts/**/*',
    docs: srcAppDir + '/documentation/**/*.{md,markdown}',
    views: [srcAppDir + '/views/**/*', '!' + srcAppDir + '/views/+(layouts)/**'],
    patterns: srcAppDir + '/patterns/**/*.{html,hbs}'
  },

  dest: {
    base: publicDir,
    app: publicAppDir,
    data: publicAppDir + '/_data/context-data.json',
    scripts: publicAssetsDir + '/scripts',
    styles: publicAssetsDir + '/styles',
    images: publicAssetsDir + '/images',
    fonts: publicAssetsDir + '/fonts'
  },

  images: {
      progressive: true,
      optimizationLevel: 3,
      svgoPlugins: [
          { removeViewBox: false },               // 3a
          { removeUselessStrokeAndFill: false },  // 3b
          { removeEmptyAttrs: false }             // 3c
      ]
  },

  sass: {
    autoprefixer: {
      // you could use ['last 2 version'] instead of listing out browser specifics
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
    },
    settings: {
      indentedSyntax: false, // true enables .sass indented syntax
      imagesPath: 'assets/images' // used by the image-url helper
    }
  },

  scriptBundles: [
    {
      entries: srcAssetsDir + '/scripts/main.js',
      dest: publicAssetsDir + '/scripts',
      outputName: 'main.js',
      require: ['jquery'],
      debug: true
    }
  ],
  // browserSync: {
  //   server: {
  //     baseDir: [
  //       publicAppDir
  //     ]
  //   },
  //   startPath: "home.html",
  //   snippetOptions: {
  //     ignorePaths: [
  //       "/styleguide/styleguide.html",
  //       "/styleguide/pattern-group.html"
  //     ]
  //   },
  //   browsers: ['google chrome'],
  //   notify: true,
  //   logPrefix: 'SERVER'
  // }

  browserSync: {
    proxy: 'http://localhost:5000',
    files: ['public/app/**/*.*'],
    port: 7000,
    browsers: ['google chrome'],
    logPrefix: 'SERVER',
    snippetOptions: {
      blacklist: ["all.html"]
    },
  }

};
