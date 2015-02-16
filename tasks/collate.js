/*
    parse HTML and Markdown files to build JSON data
 */
'use strict';

var _               = require('lodash'),
    beautifyHtml    = require('js-beautify').html,
    changeCase      = require('change-case'),
    cheerio         = require('cheerio'),
    fs              = require('fs'),
    gutil           = require('gulp-util'),
    handlebars      = require('handlebars'),
    junk            = require('junk'),
    markdown        = require('markdown-it')({ langPrefx: 'language-'}),
    mkpath          = require('mkpath'),
    path            = require('path'),
    snippet         = require('./snippet'),
    yamlFront       = require('yaml-front-matter');

var baseDir,
    beautifyOptions,
    buildMenu,
    data,
    parse,
    patternCategories,
    registerItemHelper,
    registerMenuHelper;

baseDir = 'src/toolkit/';

beautifyOptions = {
    'indent,_size': 1,
    'indent_char': ' ',
    'indent_with_tabs': true
};

/**
 * convert items to helpers so we can use them in other files
    uses cheerio to load and parse snippets
 * @param  {[type]} item [description]
 * @return {[type]}      [description]
 */
registerItemHelper = function (item) {

    try {
        handlebars.registerHelper(item.id, function() {
            var helperClasses = (typeof arguments[0] === 'string') ? arguments[0]: '';
            var $ = cheerio.load(item.content);

            $('*').first().addClass(helperClasses);

            return new handlebars.SafeString($.html());
        });

    } catch ( err ) {
        gutil.log('ERROR PROCESSING: ', item);
        gutil.log('ERROR: ', err.message);
    }
};


/**
 * Repeat a block n-number of times based on content directives
    see: http://handlebarsjs.com/block_helpers.html
 * @param  {Int} repeatTimes The number of times a block should be repeated
 * @param  {Object} block Object containing the HTML to render
 * @return {Object} An object representing all of the blocks (HTML) to render
 */
handlebars.registerHelper('iterate', function (repeatTimes, block) {
    var blocks = '', data;

    for (var i = 0; i < repeatTimes; i++) {
        if (block.data) {
            data = handlebars.createFrame(block.data || {});
            data.index = i;
        }
        blocks += block.fn(i, {data: data});
    }

    return blocks;

});


/**
 * Parse a directory of files and convert pattern snippet HTML files
 *  into Handlebars helpers, and Markdown files into notes related to the
 *  pattern snippet item
 *
 * @param  {String} dir A directory containing pattern snippets
 *
 * NOTE: This function needs to be refactored and simplified
 */
parse = function (dir) {
    var currDir = path.join(baseDir, dir);

    // create key if it doesn't exist
    if (!data[dir]) {
        data[dir] = {};
    }

    // get all the non-junk directories and files from the directory
    var raw = fs.readdirSync(currDir).filter(junk.not);
    var rawFiles, fileNames, childDirs, uniqueFileItems;
    var template, content, notes;

    // iterate files and replace the file extension with empty string
    var fileNames = raw.map(function (e, i) {
        return e.replace(path.extname(e), '');
    });

    // eliminate duplicate file names
    var items = fileNames.filter(function (e, i, a) {
        return a.indexOf(e) === i;
    });

    // ex: this will be the top level folders inside the components folder

    for (var i = 0, len = items.length; i < len; i++) {
        var item = {};
        var snips;

        item.id = items[i];
        item.name = changeCase.titleCase(item.id.replace(/-/ig, ' '));

        try {
            // read the file contents
            content = fs.readFileSync(currDir + '/' + items[i] + '.html', 'utf8').replace(/(\s*(\r?\n|\r))+$/, '');

            // parse the file contents for yaml front matter
            var result = yamlFront.loadFront(content);

            // loop through all keys and create property & value off of item object
            Object.keys(result).forEach(function (key) {
                item[key] = result[key];
            });

            // parse the content for HTML snippets
            snips = snippet(result.__content);

            // now that we have all the snippets, loop over each one and create
            // a handlebars helper for the snippet
            // use the snippet name and snippet content for the helper
            if ( snips && snips.length ) {
                item.snippets = {};

                for (var j = 0, lens = snips.length; j < lens; j++ ) {
                    var s = {};
                    if ( snips[j].type ) {
                        if (snips[j].type === 'html' ) {
                            s.id = snips[j].name;
                            s.name = changeCase.titleCase(snips[j].name.replace(/-/ig, ' '));
                            template = handlebars.compile(snips[j].content);
                            s.content = beautifyHtml(template(), beautifyOptions);

                            item.snippets[s.id] = s;
                        }

                        if (snips[j].type === 'markdown' ) {
                            item.snippets[snips[j].name].notes = markdown.render(snips[j].content);
                        }

                        registerItemHelper(s);
                    }
                }
            }
        }
        catch (e) { }

        try {
            if (item.notes && (item.notes.indexOf('.md') > -1) ) {
                notes = fs.readFileSync(path.join(currDir, item.notes), 'utf-8');
                item.notes = markdown.render(notes);

            } else {
                notes = fs.readFileSync(currDir + '/' + items[i] + '.md', 'utf8');
                item.notes = markdown.render(notes);
            }
        }
        catch (e) {
            item.notes = '';
        }

        data[dir][item.id.replace(/-/g, '')] = item;
    }

};

/**
 * [exports description]
 * @param  {[type]}   opts     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
module.exports = function(opts, callback) {
    baseDir = opts.base;
    data = {};

    // iterate over each pattern directory
    for (var i = 0, len = opts.patterns.length; i < len; i++) {
        parse(opts.patterns[i]);
    }

    // create and write the JSON file
    mkpath.sync(path.dirname(opts.dest));

    fs.writeFile(opts.dest, JSON.stringify(data), function(err) {
        if (err) {
            gutil.log(err);
        } else {
            callback && callback();
        }
    });
};


