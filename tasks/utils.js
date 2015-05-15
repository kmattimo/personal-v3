'use strict';

var
    _ = require('lodash'),
    changeCase = require('change-case'),
    fs = require('fs-extra'),
    gutil = require('gulp-util'),
    handlebars = require('handlebars'),
    beautifyHtml = require('js-beautify').html,
    markdown = require('markdown-it')().enable([ 'link' ]),
    matter = require('gray-matter');

function titleCase(str) {
    return changeCase.titleCase(str);
}

function registerPartial(name, str) {
    try {
        handlebars.registerPartial(name, str);
    }
    catch (err) {
        gutil.log(gutil.colors.red(err));
    }
}

function registerPartialFromFile(name, filePath) {
    var html = fs.readFileSync(filePath, 'utf8');
    return registerPartial(name, html);
}

var defaults = {
    register: false,
    htmlBeautify: {
        'indent,_size': 1,
        'indent_char': ' ',
        'indent_with_tabs': true
    }
};

function renderPattern(str, data, opts) {
    var template;
    opts = _.extend(defaults, opts);

    if ((typeof opts.name === 'String' && opts.name !== '') && opts.register) {
        registerPartial(opts.name, str);
    }

    try {
        template = handlebars.compile(str);
    }
    catch (err) {
        gutil.log(gutil.colors.red("ERROR: template -> '" + opts.name + "'\r\n", err));
    }

    if (data) {
        return beautifyHtml(template(data), opts.htmlBeautify);
    }
    else {
        return beautifyHtml(template(), opts.htmlBeautify);
    }
}

function renderMarkdown(str) {
    return markdown.render(str);
}

function parseMatter(str, propsToIgnore) {
    str = str.replace(/(\s*(\r?\n|\r))+$/, '');
    var matterContent = matter(str);
    var parsed = {};

    for (var prop in matterContent) {
        if (!matterContent.hasOwnProperty(prop)) {
            continue;
        }
        // delete any props flagged to be ignored
        if (propsToIgnore.indexOf(prop) === 0) {
            delete matterContent[prop];
        }

        if(matterContent[prop] !== null && typeof matterContent[prop] === 'object') {
            for (var key in matterContent[prop]) {
                if (!matterContent[prop].hasOwnProperty(key)) {
                    continue;
                }
                parsed[key] = matterContent[prop][key];
            }
        }
        else {
            parsed[prop] = matterContent[prop];
        }
    }

    return parsed;
}

module.exports = {
    parseMatter: parseMatter,
    registerPartial: registerPartial,
    registerPartialFromFile: registerPartialFromFile,
    renderPattern: renderPattern,
    renderMarkdown: renderMarkdown,
    titleCase: titleCase
};