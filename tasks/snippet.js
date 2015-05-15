/* global module:false, require:false */
'use strict';

// start snippet pattern: <!-- snippet:[type] [name] [showInNav] -->
// $1 is the pattern type, $2 is the snippet name, $3 is boolean to indicate if the
//  snippet name should appear in the pattern type navigation
var regsnippet = /<!--\s*snippet:(\w+)(?:\(([^\)]+)\))?\s*([^\s]+)?\s*(?:(.*))?\s*-->/;

// end snippet pattern -- <!-- endsnippet -->
var regend = /<!--\s*endsnippet\s*-->/;

// Character used to create key for the `snippets` object. This should probably be done more elegantly.
var snippetsJoinChar = '\ue000';


module.exports = function (content) {
    var snippets = getSnippets(content);

    content = transformSnippets(snippets, content);

    return content;
};


function getSnippets(body) {
    var lines = body.replace(/\r\n/g, '\n').split(/\n/),
        inprogress = false,
        snippets = {},
        last,
        removeBlockIndex = 0;

    lines.forEach(function (l) {
        var snippet = l.match(regsnippet),
            endsnippet = regend.test(l);

        if(snippet) {
            inprogress = true;

            if(snippet[1] === 'remove') { snippet[3] = String(removeBlockIndex++); }
            if(snippet[4]) {
                snippets[ [snippet[1], snippet[3].trim(), snippet[4].trim() ].join(snippetsJoinChar) ] = last = [];
            } else {
                snippets[ [snippet[1], snippet[3].trim() ].join(snippetsJoinChar) ] = last = [];
            }
        }

        // switch back inprogress flag when endsnippet
        if (inprogress && endsnippet) {
            last.push(l);
            inprogress = false;
        }

        if (inprogress && last) {
            last.push(l);
        }
    });

    return snippets;
}

var helpers = {
    // usesnippet and usesnippet:* are used with the blocks parsed from directives
    usesnippet: function (snippet, type, name, attbs ) {
        var linefeed = /\r\n/g.test(snippet) ? '\r\n' : '\n',
            lines = snippet.split(linefeed),
            ref = '',
            indent = (lines[0].match(/^\s*/) || [])[0],
            snippetContent = lines.slice(1, -1).join('');

        if (type === 'html') {
            // handle the HTML
            ref = snippetContent;
        } else if (type === 'markdown' ) {
            // handle the markdown
            ref = snippetContent;
        }

        ref = indent + ref;

        return snippet.replace(snippet, ref);
    }
};

function transformSnippets(snippets, content) {

    // Determine the linefeed from the content
    var linefeed = /\r\n/g.test(content) ? '\r\n' : '\n';
    var results = [];

    // handle content snippets
    Object.keys(snippets).forEach(function (key) {
        var snippet = snippets[key].join(linefeed),
            parts = key.split(snippetsJoinChar),
            type = parts[0],
            name = parts[1],
            attbs = parts[2];

        results.push({
            type: type,
            name: name,
            content: helpers.usesnippet(snippet, type, name, attbs)
        });

        //content = helpers.usesnippet(content, snippet, type, name, attbs);
    });

    //return content;
    return results;
}




