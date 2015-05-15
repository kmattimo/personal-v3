/**
 * parse HTML and Markdown files to build JSON data
 */

'use strict';

// node modules
var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var chalk = require('chalk');
var cheerio = require('cheerio');
var fs = require('fs');
var fse = require('fs-extra');
var globby = require('globby');
var Handlebars = require('handlebars');
var marked = require('marked');
var matter = require('gray-matter');
var path = require('path');
var sortObj = require('sort-object');
var yaml = require('js-yaml');

// kickstart modules
var Kickstart = require('../src/kickstart/lib/kickstart');

/**
 * Default collate configuration object
 *
 * @type {Object}
 */
var defaults = {
    layout: 'default',
    layouts: 'src/app/views/layouts/*',
    layoutIncludes: 'src/app/views/layouts/includes/*',
    views: ['src/app/views/**/*', '!src/app/views/+(layouts)/**'],
    patterns: 'src/app/patters/**/*',
    data: 'src/_data/**/*.{json,yml}',
    docs: '/src/docs/**/*.{md,markdown}',
    keys: {
        patterns: 'patterns',
        views: 'views',
        docs: 'docs'
    },
    dest: 'public',
    beautifier: {
        indent_size: 1,
        indent_char: ' ',
        indent_with_tabs: true
    },
    parser: {
        useShortName: false,
        match: /.h(tml|bs)$/,
        sortBy: 'order'
    },
    onError: null,
    logErrors: false,
    logVerbose: false,
    debug: false
};

/**
 * [options description]
 *
 * @type {Object}
 */
var options = {};

/**
 * Kickstart data
 *
 * @type {Object}
 */
var kickstart = {
    layouts: {},
    annotations: {},
    config: {},
    data: {},
    navigation: {},
    patterns: {},
    patternData: {},
    partials: {},
    views: {},
    docs: {}
};

var logToFile = function (outputFile, content, type) {
    if (type && type === 'markup') {
        fse.outputFile(outputFile, content, function (err) {
            console.log(chalk.bold.red('Could not write debug file', err));
        });
    }
    else {
        fse.outputJson(outputFile, content, function (err) {
            if (err) {
                console.log(chalk.bold.red('Could not write debug file', err));
            }
        });
    }
};

/**
 * Helper to register Handlebars partial. Uses cheerio to add classes to
 *   resulting HTML
 *
 * @param {String} name The name to use for the partial
 * @param {String} str  The partial content
 *
 * @return {String} Handlebars-processed HTML string
 */
var registerPartialHelper = function (name, str) {
    try {
        Handlebars.registerHelper(name, function () {
            var helperClasses = (typeof arguments[0] === 'string') ? arguments[0] : '';
            var $ = cheerio.load(str);

            $('*').first().addClass(helperClasses);

            return new Handlebars.SafeString($.html());
        });

    } catch (err) {
        console.log(chalk.bold.red('ERROR PROCESSING: ', item, err.message));
    }
};

/**
 * Error handler for errors that occur in this task
 *
 * @param {Object} err The error object
 *
 * @return {Void} This function has no return value
 */
var handleError = function (err) {

    // by default, end the process if there's an error
    var endProcess = true;

    // build error object by combining err object (arg) and some defaults
    var error = _.assign({}, {
        name: 'Error',
        stack: '',
        message: 'An error occurred'
    }, err);

    // call onError if it's a function
    if (_.isFunction(options.onError)) {
        options.onError(error);
        endProcess = false;
    }

    // log errors
    if (options.logErrors) {
        console.error(chalk.bold.red('Error [Kickstart]: ' + err.message, options.logVerbose ? err.stack : ''));
        endProcess = false;
    }

    // end the process if endProcess is true
    if (endProcess) {
        console.error(chalk.bold.red('Error [Kickstart]: ' + err.message, options.logVerbose ? err.stack : ''));
        process.exit(1);
    }
};

/**
 * Gets the name of a file, with or with a prefix
 *
 * @param {String} filePath     The path to the file
 * @param {Bool} retainPrefix Indicator for whether the file name prefix should be removed from the file name
 *
 * @return {[type]}
 */
var getName = function(filePath, retainPrefix) {
    var prefix = /^[0-9|\.\-\_]+/;
    var name = path.basename(filePath, path.extname(filePath));
    return retainPrefix ? name : name.replace(prefix, '');
};

/**
 * Get yaml matter data by reading a file and parsing its content
 *
 * @param {Object} file The file object for a pattern
 *
 * @return {Object} The parsed YAML front matter as an object
 */
var getMatter = function(file) {
    return matter.read(file, {
        parser: require('js-yaml').safeLoad
    });
};

/**
 * Find the patterns that are referenced by and referenced from a given
 *   pattern
 *
 * @param  {Object} pattern - a pattern object representing an HTML pattern and
 *   its metadata
 *
 * @return {void} This function does not return a value
 */
var getPatternLineage = function(pattern) {
    // pattern.lineage = pattern.lineage || [];
    // pattern.lineageIndex = pattern.lineageIndex || [];
    // pattern.lineageIndexReverse = pattern.lineageIndexReverse || [];
    // pattern.lineageReverse = pattern.lineageReverse || [];
    var lineage = {
        includes: [],
        includesIndex: [],
        includedBy: [],
        includedByIndex: []
    };

    var matches = pattern.template.match(/{{>([ ]+)?([A-Za-z0-9-]+)?(?:[ \:[A-Za-z0-9-=]+)?(?:(| )\(.*)?([ ]+)}}/g);

    if (matches === null) {
        return;
    }

    matches.forEach(function (match, index, matches) {

        var foundPattern = match.replace("{{> ", "").replace(" }}", "");
        foundPattern = foundPattern.replace(/\s+/, '\x01').split('\x01')[0];

        if (lineage.includesIndex.indexOf(foundPattern) > -1) {
            return;
        }

        lineage.includesIndex.push(foundPattern);

        kickstart.patterns.forEach(function (ancestor, index, patterns) {
            var
                searchPattern = ancestor.patternGroup + "-" + ancestor.id,
                referenced,
                referencedBy,
                patternLabel;

            if (searchPattern !== foundPattern) {
                return;
            }

            referenced = {
                "pattern": foundPattern,
                "patternPath": pattern.patternLink
            };

            // TODO: Look into why JSON.Stringify prevents access to these props in Handlebars
            // was JSON.Stringify(lineage)
            lineage.includes.push(referenced);

            // TODO: Why am I doing this?
            // if (!_.isEmpty(pattern.data)) {
            //     pattern.data = _.merge({}, ancestor.data, pattern.data);
            // } else {
            //     pattern.data = _.merge({}, pattern.data, ancestor.data);
            // }

            patternLabel = pattern.patternGroup + "-" + pattern.id;

            if (ancestor.lineage.includedByIndex.indexOf(patternLabel) > -1) {
                return;
            }

            ancestor.lineage.includedByIndex.push(patternLabel);

            referencedBy = {
                "pattern": patternLabel,
                "patternPath": ancestor.patternLink
            };

            // TODO: Look into why JSON.Stringify prevents access to these props in Handlebars
            // was JSON.Stringify(lineageReverse)
            ancestor.lineage.includedBy.push(referencedBy);

        });

    });

    return lineage;
};


/**
 * Convert a string to Title Case
 *
 * @param {String} str The string to convert to title case
 *
 * @return {String} The string converted to title case
 */
var toTitleCase = function(str) {
    return str.replace(/(\-|_)/g, ' ').replace(/\w\S*/g, function(word) {
        return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
    });
}

/**
 * [writeStyleguideJson description]
 *
 * @param {[type]} dest    [description]
 * @param {[type]} content [description]
 *
 * @return {[type]}
 */
var writeStyleguideJson = function(dest, content) {
    fse.outputJsonSync(dest, content, function (err) {
        if (err) {
            console.error(chalk.bold.red(err));
        }
        else {
            console.log(chalk.dim.green(dest + ' file created'));
        }
    });
};

/**
 * [parsePatterns description]
 *
 * @return {[type]}
 */
var parsePatterns = function() {

    // reset patterns object
    kickstart.patterns = {};

    var files = globby.sync(options.patterns, { nodir: true, nosort: true });

    // get the base directory path that contains all the patterns
    var baseDir = options.patterns.replace(/(\/\*\*)+?(\/\*)+?\.(\{[A-Za-z0-9,]*\})/, '');
    baseDir = path.normalize(baseDir).split(path.sep).pop();

    var dirs = _.uniq(_.map(files, function (file) {
        return path.normalize(path.dirname(file)).split(path.sep).pop();
    }));

    files.forEach(function (file) {

        var collection = getName(path.normalize(path.dirname(file)).split(path.sep).pop());
        var parent = getName(path.normalize(path.dirname(file)).split(path.sep).slice(-2, -1)[0]);
        var isSubCollection = (dirs.indexOf(parent) > -1);

        if (parent !== realParent) {
            console.log('parent does not equal real parent');

            kickstart.patterns[realParent] = kickstart.patterns[realParent] || {
                name: toTitleCase(realParent),
                items: {}
            };

            if (!isSubCollection) {
                kickstart.patterns[realParent].items[collection] = kickstart.patterns[realParent].items[collection] || {
                    name: toTitleCase(collection),
                    items: {}
                };
            }
            else {
                kickstart.patterns[realParent].items[parent] = kickstart.patterns[realParent].items[parent] || {
                    name: toTitleCase(parent),
                    items: {}
                };
                kickstart.patterns[realParent].items[parent].items[collection] = kickstart.patterns[realParent].items[parent].items[collection] || {
                        name: toTitleCase(collection),
                        items: {}
                    };
            }
        } else {
            if (!isSubCollection) {
                kickstart.patterns[collection] = kickstart.patterns[collection] || {
                    name: toTitleCase(collection),
                    items: {}
                };
            }
            else {
                kickstart.patterns[parent].items[collection] = kickstart.patterns[parent].items[collection] || {
                    name: toTitleCase(collection),
                    items: {}
                };
            }
        }

    });

    // iterate each file
    files.forEach(function (file) {

        var matter = getMatter(file);
        var collection = getName(path.normalize(path.dirname(file)).split(path.sep).pop());
        var parent = getName(path.normalize(path.dirname(file)).split(path.sep).slice(-2, -1)[0]);
        var realParent = (parent === baseDir)
                    ? parent
                    : getName(path.normalize(path.dirname(file)).split(path.sep).slice(-3, -1)[1]);
        var isSubCollection = (dirs.indexOf(parent) > -1);
        var id, key;

        if (isSubCollection) {
            if (parent === realParent) {
                id = collection + '.' + getName(file);
                key = collection + '.' + getName(file, true);
            } else {
                id = parent + '.' + collection + '.' + getName(file);
                key = parent + '.' + collection + '.' + getName(file, true);
            }
        } else {
            if (parent === realParent) {
                id = getName(file);
                key = getName(file, true);
            } else {
                id = realParent + '.' + getName(file);
                key = realParent + '.' + getName(file, true);
            }
        }

        var localData = _.omit(matter.data, 'notes');

        var content = matter.content.replace(/^(\s*(\r?\n|\r))+|(\s*(\r?\n|\r))+$/g, '');

        if (!isSubCollection) {
            if (parent === realParent) {
                kickstart.patterns[collection].items[key] = {
                    name: toTitleCase(id),
                    notes: (matter.data.notes) ? marked(matter.data.notes) : '',
                    data: _.omit(localData, 'order'),
                    order: localData.order ? localData.order : ''
                };
            } else {
                kickstart.patterns[realParent].items[collection].items[key] = {
                    name: toTitleCase(id),
                    notes: (matter.data.notes) ? marked(matter.data.notes) : '',
                    data: _.omit(localData, 'order'),
                    order: localData.order ? localData.order : ''
                };
            }

        } else {
            if ( parent === realParent) {
                kickstart.patterns[parent].items[collection].items[key] = {
                    name: toTitleCase(id.split('.')[1]),
                    notes: (matter.data.notes) ? marked(matter.data.notes) : '',
                    data: _.omit(localData, 'order'),
                    order: localData.order ? localData.order : ''
                };
            } else {
                kickstart.patterns[realParent].items[parent].items[collection].items[key] = {
                    name: toTitleCase(id.split('.')[1]),
                    notes: (matter.data.notes) ? marked(matter.data.notes) : '',
                    data: _.omit(localData, 'order'),
                    order: localData.order ? localData.order : ''
                };
            }

        }

        kickstart.patternData[id.replace(/\./g, '-')] = localData;

        // namespace local field data so that partials can use them
        // only affects compile-time
        // @example {{field}} => {{pattern-name.field}}
        if (!_.isEmpty(localData)) {
            _.forEach(localData, function (val, key) {
                var regex = new RegExp('(\\{\\{[#\/]?)(\\s?' + key + '+?\\s?)(\\}\\})', 'g');
                content = content.replace(regex, function (match, openBraces, field, closeBraces) {
                    return openBraces + id.replace(/\./g, '-') + '.' + field.replace(/\s/g, '') + closeBraces;
                });
            });
        }

        Handlebars.registerPartial(id, content);
    });

    kickstart.patterns = sortObj(kickstart.patterns, 'order');

    for (var collection in kickstart.patterns) {
        kickstart.patterns[collection].items = sortObj(kickstart.patterns[collection].items, 'order');
        //kickstart.patterns[collection].items = _.sortBy(kickstart.patterns[collection].items, options.parser.sortBy);
    }

     logToFile(process.cwd() + '/.debug/patterns.json', kickstart.patterns);
};

/**
 * helper function to read a JSON file
 *
 * @param {String} file the path to the JSON file
 *
 * @return {Object, null} the object-ified content of the JSON file, or null if
 *   there's no file
 */
var readJsonFile = function(file) {
    // Try to assign kickstart.config property from local config.json file
    try {
        return fse.readJSONSync(file, 'utf8');
    }
    catch (err) {
        return null;
    }
};

var registerHelpers = function () {


    /**
     * Repeat a block n-times based on content directives. See
     *   http://handlebarsjs.com/block_helpers.html
     *
     * @param  {Int} repeatTimes The number of times a block should be repeated
     * @param  {Object} block Object containing the HTML to render
     *
     * @return {Object} An object representing all of the blocks (HTML) to render
     */
    Handlebars.registerHelper('iterate', function (repeatTimes, block) {
        var blocks = '', data;

        for (var i = 0; i < repeatTimes; i++) {
            if (block.data) {
                data = Handlebars.createFrame(block.data || {});
                data.index = i;
            }
            blocks += block.fn(i, { data: data });
        }

        return blocks;

    });

    /**
     * Handlebars helper to check if one or another object is empty (null or
     *   undefind) if either object exists, the block will be rendered else, the
     *   block will not be rendered
     *
     * @param {Object} objIf - any object that can be evaluated
     * @param {Object} objOr - any object that can be evaluated
     * @param {Object} options - options
     *
     * @return {Object} an object representing what to render
     */
    Handlebars.registerHelper('if:or', function(objIf, objOr, options) {
      if (Handlebars.Utils.isEmpty(objIf) && Handlebars.Utils.isEmpty(objOr)) {
        return options.inverse(this);
      } else {
        return options.fn(this);
      }
    });

};

var init = function (projectOptions) {

    // merge the project-specific options with the default options
    options = _.merge({}, defaults, projectOptions);

    registerHelpers();
    //parseLayouts();
    //parseLayoutIncludes();
    //parseData();
    parsePatterns();
    //parseViews();
    //parseDocs();

};

var assembleTemplates = function () {

    // get only the user template files
    var files = globby.sync(options.views, { nodir: true });

    files.forEach(function (file) {

        var id = getName(file);

        console.log(id);
        // do more stuff here...
    });
};

/**
 * [exports description]
 *
 * @param  {[type]}   opts     [description]
 * @param  {Function} callback [description]
 *
 * @return {[type]}            [description]
 */
module.exports = function (opts, done) {
    // shift arguments if opts arg is not provided
    done = (typeof opts === 'function') ? opts : done;

    try {
        init(opts);
        assembleTemplates();
    }
    catch (err) {
        handleError(err);
    }

    // kickstart.config = readJsonFile('./config.json');
    // kickstart.data = readJsonFile('./src/_data/data.json');

};