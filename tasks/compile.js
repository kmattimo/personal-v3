'use strict';

var _ = require('lodash');
var beautifyHtml = require('js-beautify').html;
var fs = require('fs-extra');
var gutil = require('gulp-util');
var handlebars = require('handlebars');
var path = require('path');
var pluralize = require('pluralize');
var through = require('through2');

var data = {};

function registerStyleguidePartials() {

}

/**
 * [buildKickstart description]
 * @param  {[type]}   file     [description]
 * @param  {[type]}   encoding [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
function buildKickstart (file, encoding, callback) {

    // add to data object
    data.kickstart = true;

    var source = file.contents.toString(),
        html = utils.renderPattern(source, {'data': data});

    // buffer the transformed content and assign to file.contents
    file.contents = new Buffer(html);

    this.push(file);

    callback && callback();
};

function buildStyleguide() {
    var
        patterns = data.patterns,
        patternGroups = _.groupBy(patterns, 'patternGroup'),
        patternData = {},
        navigationData = { 'data': { 'navigation': data.navigation } },
        templates = {
            navigationTemplate: fs.readFileSync('./src/kickstart/partials/navigation.html', 'utf8'),
            styleguideTemplate: fs.readFileSync('./src/kickstart/styleguide.html', 'utf8'),
            siteTemplate: fs.readFileSync('./src/kickstart/index.html', 'utf8')
        };

    var styleguidePatterns = [];
    // loop over each key in patternGroups object
    for (var key in patternGroups) {
        if (!patternGroups.hasOwnProperty(key)) {
            continue;
        }

        styleguidePatterns = _.union(styleguidePatterns, patternGroups[key]);

        fs.outputJson('./.debug/' + key + '-patterns.json', patternGroups[key]);
    }

    patternData = { 'patterns': styleguidePatterns };
    patternData.styleguideIntro = data.data.styleguideIntro;
    patternData.styleguideTitle = data.data.styleguideTitle;

    // render the kickstart navigation
    var navigationHtml = utils.renderPattern(templates.navigationTemplate, navigationData);
    // register the rendered kickstart navigation as a handlebars partial for later reference
    utils.registerPartial('patternNavigation', navigationHtml);

    // render the styleguide file
    var styleguideHtml = utils.renderPattern(templates.styleguideTemplate, patternData);

    // render all patterns to a single file as the starting point of the kickstart styleguide
    var kickstartSiteHtml = utils.renderPattern(templates.siteTemplate);

    // write the files to disk
    fs.outputFileSync('./public/kickstart/html/styleguide.html', styleguideHtml);
    fs.outputFileSync('./public/index.html', kickstartSiteHtml);
}


function buildPatterns () {
    var patterns = data.patterns;
    var navigation = data.navigation;
    var patternGroups = _.groupBy(patterns, 'patternGroup');
    var patternGroupTemplate = fs.readFileSync('./src/kickstart/pattern-group.html', 'utf8');
    var patternGroupHtml;

    // build a pattern HTML file for each pattern category
    // and each pattern subcategory
    _.forEach(patternGroups, function(patterns, patternGroup) {
        var patternSubGroups = _.groupBy(patterns, 'patternSubGroup');
        var subGroupedPatterns = [];

        _.forEach(patternSubGroups, function(subGroupPatterns, patternSubGroup) {
            var patternsBySubGroup = {
                groupName: subGroupPatterns.length === 1 ? null : pluralize(utils.titleCase(patternSubGroup)),
                patterns: subGroupPatterns
            };

            subGroupedPatterns.push(patternsBySubGroup);

            patternGroupHtml = utils.renderPattern(patternGroupTemplate, {
                data: {
                    patternGroups: subGroupedPatterns
                }
            });

            fs.outputFileSync('./public/patterns/' + patternGroup + '/' + patternSubGroup.replace(/\s+/, '-').toLowerCase() + '.html', patternGroupHtml);
        });

        patternGroupHtml = utils.renderPattern(patternGroupTemplate, {
            data: {
                patternGroups: subGroupedPatterns
            }
        });

        fs.outputFileSync('./public/patterns/' + patternGroup + '/' + 'index.html', patternGroupHtml);

    });
}

/**
 * [buildToolkit description]
 * @param  {[type]}   file     [description]
 * @param  {[type]}   encoding [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
function buildToolkit (file, encoding, callback) {

    // add to data object
    // indicate we aren't building kickstart
    data.kickstart = false;

    var patterns = data.patterns;

    var patternType = file.path.indexOf('template') > -1 ? 'templates' : 'pages'

    var key = path.basename(file.path, '.html').replace(/-/g, '');

    var source;

    if (data[patternType]) {
        var comments = {
            start: '\n\n<!-- Start ' + data[patternType][key].name + ' template -->\n\n',
            end: '\n\n<!-- /End ' + data[patternType][key].name + ' template -->\n\n'
        };

        source = '{{> intro}}' +
                        comments.start +
                        data[patternType][key].content +
                        comments.end +
                        '{{> outro}}';

    }
    else {
        source  = '{{> intro}}';

        for (var i = 0, len = patterns.length; i < len; i++) {
            source += patterns[i].content;
        }

        source += '{{> outro}}';

        console.log('SOURCE\r\n------------------\r\n', source);
    }


    var template = handlebars.compile(source),
        html = template(data);

    // buffer file
    file.contents = new Buffer(html);
    // update the file path with the pattern type name plus a dash plus the key
    // remove any pluralization from the pattern type value
    file.path = file.path.replace(key, patternType.replace('s', '') + "-" + key);

    this.push(file);

    callback && callback();

};

/**
 * [exports description]
 * @type {Object}
 */
module.exports = function (opts, callback) {
    // assign the json data file content to the global (this file) data var
    try {
        data = JSON.parse(fs.readFileSync(opts.data));

        //return through.obj( (opts.template) ? buildPatterns : buildKickstart );
        // TODO: Clean this up and convert back to streams
        if (opts.template) {
            registerStyleguidePartials();
            buildPatterns();
            buildStyleguide();
        }
    }
    catch (err) {
        gutil.log(gutil.colors.red(err));
    }


    callback && callback();
};
