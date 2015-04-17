/*
    parse HTML and Markdown files to build JSON data
 */
'use strict';

var _               = require('lodash'),
    beautifyHtml    = require('js-beautify').html,
    changeCase      = require('change-case'),
    cheerio         = require('cheerio'),
    fs              = require('fs-extra'),
    gutil           = require('gulp-util'),
    handlebars      = require('handlebars'),
    junk            = require('junk'),
    marked          = require('marked'),
    mkpath          = require('mkpath'),
    path            = require('path'),
    snippet         = require('./snippet'),
    matter          = require('gray-matter');

var kickstart = {};

try {
    kickstart.config = fs.readFileSync('./config.json', 'utf8');
}
catch (err) {
    gutil.log(gutil.colors.magenta('No config.json file found. Using config argument instead'));
    kickstart.config = {};
}


var baseDir,
    beautifyOptions,
    buildMenu,
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
registerItemHelper = function (name, str) {

    try {
        handlebars.registerHelper(name, function() {
            var helperClasses = (typeof arguments[0] === 'string') ? arguments[0]: '';
            var $ = cheerio.load(str);

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
    // if (!kickstart[dir]) {
    //     kickstart[dir] = {};
    // }

    // get all the non-junk directories and files from the directory
    var raw = fs.readdirSync(currDir).filter(junk.not);

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
        var snippets = [];
        var content;
        var itemName = items[i].toLowerCase();

        // item.id = items[i];
        // item.name = changeCase.titleCase(item.id.replace(/-/ig, ' '));
        // item.patterns = [];

        try {
            // read the file contents
            content = fs.readFileSync(currDir + '/' + items[i] + '.html', 'utf8').replace(/(\s*(\r?\n|\r))+$/, '');

            // parse the file contents for yaml front matter
            var matterContent = matter(content);

            // the matter content has a data property that contains the yaml
            _.merge(item, matterContent.data);
            // merge the other matter content but don't include the data prop
            _.merge(item, _.omit(matterContent, ['orig', 'data']));

            item.category = (item.category || currDir).toLowerCase();

            try {
                var jsonFileName = currDir + '/' + items[i] + '.json';
                var itemData = fs.readJSONSync(jsonFileName);

                _.merge(kickstart.data, itemData);
            }
            catch (err) {}

            // get all the snippets from the file content
            snippets = snippet(item.content);

            // now that we have all the snippets, loop over each one and create
            // a handlebars helper for the snippet
            // use the snippet name and snippet content for the helper
            if (snippets.length) {
                //item.snippets = {};
                snippets.forEach(function(snippet, index, snippets) {
                    var pattern;
                    var template;
                    var associatedPattern;

                    if (!snippet.type) { return; }

                    if (snippet.type === 'html') {
                        pattern = {};
                        pattern.id = snippet.name;
                        pattern.name = changeCase.titleCase(snippet.name.replace(/-/ig, ' '));
                        pattern.patternGroup = item.category;
                        pattern.patternSubGroup = itemName;
                        pattern.template = snippet.content;
                        pattern.key = pattern.patternGroup + "-" + pattern.id;
                    }
                    else if (snippet.type === 'markdown') {
                        associatedPattern = _.find(kickstart.patterns, { id: snippet.name });
                        associatedPattern.notes = marked(snippet.content);
                    }

                    if (pattern) {
                        template = handlebars.compile(pattern.template);
                        pattern.content = beautifyHtml(template(kickstart.data), beautifyOptions);
                        registerItemHelper(pattern.id, pattern.content);
                        kickstart.patterns.push(pattern);
                    }
                });
            }
        }
        catch (err) { }

        try {
            var notes = '';
            if (item.notes && (item.notes.indexOf('.md') > -1) ) {
                notes = fs.readFileSync(path.join(currDir, item.notes), 'utf-8');
                item.notes = marked(notes);

            } else {
                notes = fs.readFileSync(currDir + '/' + items[i] + '.md', 'utf8');
                item.notes = marked(notes);
            }
        }
        catch (err) {
            item.notes = '';
        }

        // TODO:
        // look at lodash _.indexBy to see how to group patterns by category or type
        //kickstart[dir][item.id.replace(/-/g, '')] = item;
        //kickstart.patterns.push(item);
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

    // initilize some kickstart object properties
    kickstart.data = fs.readJSONSync('./src/_data/data.json');
    kickstart.header = fs.readFileSync('./src/toolkit/styleguide/partials/intro.html', 'utf8');
    kickstart.footer = fs.readFileSync('./src/toolkit/styleguide/partials/outro.html', 'utf8');
    kickstart.patterns = [];
    // iterate over each pattern directory
    for (var i = 0, len = opts.patterns.length; i < len; i++) {
        parse(opts.patterns[i]);
    }

    // var test = _.groupBy(kickstart.patterns, 'patternGroup');

    // write the kickstart object as a json file, then execute any callback
    fs.outputJson(opts.dest, kickstart, function(err) {
        if (err) {
            gutil.log(gutil.colors.red(err));
        }
        else {
            gutil.log(gutil.colors.green(opts.dest + ' file created'));
            callback && callback();
        }
    });
};