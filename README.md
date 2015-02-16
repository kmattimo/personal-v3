Kickstart is a website starter kit, living style guide creator, and task runner that helps you kickstart a website build and create a living style guide that grows with your site.

##Features
* Command Line Interface
* Scaffold new projects or work with existing projects
* Easy templating with handlebars
* Sass compilation, optimization and minification
* JavaScript bundling with Browserify, minification
* JavaScript and CSS linting
* Image optimization
* SVG spriting and optimization
* Static file serving and device synchronization with BrowserSync

## Installation

### Clone repository
To use Kickstart, clone the Kickstart repository to a local folder on your machine.

```
cd some/project/folder
git clone https://github.com/onenorth/kickstart
```

### Install dependencies
After the clone operation, navigate to the newly-create repository directory and install kickstart.

```
cd /some/project/folder/kickstart
npm install
```

## New Projects
If you are creating a brand new project, once you've cloned the kickstart repository, all you need to do is run `npm start` from the command line to begin a new project. This will install all required dependencies, then spin up a local web server that watches your files for changes.
```
npm start
```

## Building
If you are not interested in running a development web server, you can simply build the projects files without starting web server.

```
npm build
```

### Production Builds
If you want to build a minified and optimized version of your project, you can do that by passing in the `--production` flag when you build.
```
npm build --production
```
##