(function(global, undefined) {


  var doc = global.document || null;

  var App = {
    init: function() {
      console.log("App initialized");
      
      jQuery = require('./jquery', function() {
        
      console.log( jQuery(".particleCanvas").width() );
      console.log("!");
      });
      
      require('./particles');
      
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