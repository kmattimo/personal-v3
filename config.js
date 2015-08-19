var path = require('path');
// source directories
var srcDir = 'src';
var srcAssetsDir = srcDir + '/public';

// destination directories
var destDir = 'site';
var destAssetsDir = destDir + '/public';

module.exports = {

  dev: true, // gutil.env.dev

  logging: {
    logErrors: true,
    writeToFile: false,
    verbose: true
  },

  src: {
    data: srcDir + '/data/**/*.{json,yaml}',
    html: srcDir + '/**/*.{hbs,html}',
    docs: srcDir + '/docs/**/*.{md,markdown}',
    pages: srcDir + '/pages/**/*.{hbs,html}',
    includes: srcDir + '/includes/**/*.{hbs,html}',
    scripts: srcAssetsDir + '/js/**/*.{js,jsx}',
    styles: srcAssetsDir + '/styles/**/*.{sass,scss}',
    images: srcAssetsDir + '/images/**/*.{gif,jpg,jpeg,png,svg,tiff}',
    fonts: srcAssetsDir + '/fonts/**/*'
  },

  dest: {
    base: destDir,
    assets: destAssetsDir,
    scripts: destAssetsDir + '/js',
    styles: destAssetsDir + '/styles',
    images: destAssetsDir + '/images',
    fonts: destAssetsDir + '/fonts'
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
      imagesPath: 'public/images' // used by the image-url helper
    }
  },

  scriptBundles: [
    {
      entries: srcAssetsDir + '/js/main.js',
      dest: destAssetsDir + '/js',
      outputName: 'main.js',
      require: ['jquery'],
      debug: true
    }
  ],
  browserSync: {
    server: {
      baseDir: [destDir, 'styleguide'],
      routes: {
        '/styleguide': 'styleguide'
      }
    },
    startPath: 'home.html',
    snippetOptions: {
      ignorePaths: ['styleguide', 'styleguide/*.html']
    },
    browsers: ['google chrome'],
    notify: true,
    logPrefix: 'SERVER'
  }
};
