var path = require('path');
var styleguide = require('kickstart-styleguide');

styleguide({
    components: path.resolve(__dirname, 'src/app/patterns'),
    ext: 'html',
    data: path.resolve(__dirname, 'public/app/_data'),
    static: path.resolve(__dirname, 'public/app/assets'),
    staticPath: '/public/app/assets',
    stylesheets:['styles/main.css'],
    scripts: ['scripts/main.js'],
    port: 5000
});
