var _ = require('lodash');

function Kickstart () {
  this.helpers = {};
  this.init();
};

Kickstart.prototype = {
  constructor: Kickstart,

  init: function() {
    registerDefaultHelpers(this);
  },

  registerHelper: function (name, fn) {
    if (_.isObject(name)) {
      if (fn) { throw new Exception('Arg not supported with multiple helpers'); }
      _.extend(this.helpers, name);
    }
    else {
      this.helpers[name] = fn;
    }
  },

  unregisterHelper: function (name) {
    delete this.helpers[name];
  }

};

Kickstart.prototype.set = function (key, value) {
  if (arguments.length === 1) {
    return this.options[key];
  }

  this.options[key] = value;
  return this;
}

Kickstart.prototype.get = Kickstart.prototype.set;

var regsnippet = /<!--\s*snippet:(\w+)(?:\(([^\)]+)\))?\s*([^\s]+)?\s*(?:(.*))?\s*-->/;

var regend = /<!--\s*endsnippet\s*-->/;

var joinChar = '\ue000';

var registerDefaultHelpers = function (instance) {

  instance.registerHelper('snippet', function(content, type) {

    if (instance.helpers['snippet:pre:' + type]) {
      return instance.helpers['snippet:pre:' + type](content);
    }
    return content;

  });

  instance.registerHelper('snippet:pre:html', function(content) {

    var linefeed = /\r\n/g.test(content) ? '\r\n' : '\n';
    var results = {};

    var blocks = getBlocks.call(instance, content);

    Object.keys(blocks).forEach(function (key) {
      var block = blocks[key].join(linefeed);
      var parts = key.split(joinChar);
      var type = parts[0];
      var name = parts[1];
      var attrb = parts[2];

      results[name] = {
        name: name,
        attr: attrb ? attrb : '',
        content: instance.helpers['snippet:' + type](block, name, attrb)
      };
    });

    return results;
  });

  instance.registerHelper('snippet:html', function(block, name, attrb) {
    var linefeed = /\r\n/g.test(block) ? '\r\n' : '\n';
    var lines = block.split(linefeed);
    var ref = '';
    var indent = (lines[0].match(/^\s*/) || [])[0];
    var html = lines.slice(1, -1).join('');

    ref = indent + html;

    return block.replace(block, ref);

  });

};

var getBlocks = function(body) {

  var lines = body.replace(/\r\n/g, '\n').split(/\n/);
  var block = false;
  var sections = {};
  var last;
  var removeBlockIndex = 0;

  lines.forEach(function(l) {
    var snippet = l.match(regsnippet);
    var endsnippet = regend.test(l);

    if(snippet) {
        block = true;

        if(snippet[1] === 'remove') { snippet[3] = String(removeBlockIndex++); }

        if(snippet[4]) {
            sections[[snippet[1], snippet[3].trim(), snippet[4].trim()].join(joinChar)] = last = [];
        } else {
            sections[[snippet[1], snippet[3].trim()].join(joinChar)] = last = [];
        }
    }

    // switch back block flag when endsnippet
    if(block && endsnippet) {
        last.push(l);
        block = false;
    }

    if(block && last) {
        last.push(l);
    }
  });

  return sections;

};

var kickstart = module.exports = exports = new Kickstart;