'use strict';

var fs          = require('fs'),
    gutil       = require('gulp-util'),
    path        = require('path'),
    handlebars  = require('handlebars'),
    through     = require('through2');

var data, registerPartials, buildKickstart, buildToolkit;

/**
 * [registerPartials description]
 * @return {[type]} [description]
 */
registerPartials = function() {

    var partials = fs.readdirSync('src/toolkit/styleguide/partials'),
        html;

    // turn html files into handlebars partials
    // count down for this one
    for (var i = partials.length - 1; i >= 0; i--) {
        html = fs.readFileSync('src/toolkit/styleguide/partials/' + partials[i], 'utf-8');

        handlebars.registerPartial(partials[i].replace(/.html/, ''), html);
    }
};

/**
 * [buildKickstart description]
 * @param  {[type]}   file     [description]
 * @param  {[type]}   encoding [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
buildKickstart = function (file, encoding, callback) {

    // add to data object
    data.kickstart = true;

    var source = file.contents.toString(),
        template = handlebars.compile(source),
        html = template(data);

    // buffer the file
    file.contents = new Buffer(html);

    this.push(file);

    callback && callback();
};

/**
 * [buildToolkit description]
 * @param  {[type]}   file     [description]
 * @param  {[type]}   encoding [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
buildToolkit = function (file, encoding, callback) {

    // add to data object
    // indicate we aren't building kickstart
    data.kickstart = false;

    var patternType = file.path.indexOf('template') > -1 ? 'templates' : 'pages'

    var key = path.basename(file.path, '.html').replace(/-/g, '');

    var comments = {
        start: '\n\n<!-- Start ' + data[patternType][key].name + ' template -->\n\n',
        end: '\n\n<!-- /End ' + data[patternType][key].name + ' template -->\n\n'
    };

    var source = '{{> intro}}' +
                    comments.start +
                    data[patternType][key].content +
                    comments.end +
                    '{{> outro}}';

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
module.exports = function (opts) {
    data = JSON.parse(fs.readFileSync(opts.data));
    registerPartials();

    return through.obj( (opts.template) ? buildToolkit : buildKickstart );
};
