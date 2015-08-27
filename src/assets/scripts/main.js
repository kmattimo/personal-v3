(function(global, undefined) {

  var doc = global.document || null;

  var App = {
    init: function() {
      console.log("App initialized");

      return this;
    },

    reload: function() {
      console.log("App reloaded");

      return this;
    },

    unload: function() {
      console.log("App unloaded");

      return this;
    }
  };

  global.App = App;

  App.init();

})(this);