'use strict';

/**
 * Global `kickstart` object
 * @namespace
 */
var kickstart = window.kickstart = {};


/**
 * Default options
 * @type {Object}
 */
kickstart.options = {
    toggles: {
        details: true,
        notes: true,
        code: true
    }
};

/**
 * Feature detection
 * @type {Object}
 */
kickstart.test = {};

// test for localstorage
kickstart.test.localStorage = (function () {
    var test = '_f';
    try {
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch(e) {
        return false;
    }
}());

// create storage object if it doesn't exist; store options
if (kickstart.test.localStorage) {
    localStorage.kickstart = localStorage.kickstart || JSON.stringify(kickstart.options);
}


/**
 * Cache DOM
 * @type {Object}
 */
kickstart.dom = {
    window: window,
    document: document,
    documentEl: document.documentElement,
    body: document.body,
    primaryMenu: document.querySelector('.ks-navigation'),
    menuItems: document.querySelectorAll('.ks-navLink'),
    menuToggle: document.querySelector('.t-menuToggle')
};


/**
 * Build color chips
 */
kickstart.buildColorChips = function () {

    var chips = document.querySelectorAll('.t-color-chip'),
        color;

    for (var i = chips.length - 1; i >= 0; i--) {
        color = chips[i].querySelector('.t-color-chip__color').innerHTML;
        chips[i].style.borderTopColor = color;
        chips[i].style.borderBottomColor = color;
    }

    return this;

};


/**
 * Add `t-active` class to active menu item
 */
kickstart.setActiveItem = function () {

    /**
     * @return {Array} Sorted array of menu item 'ids'
     */
    var parsedItems = function () {

        var items = [],
            id, href;

        if (!kickstart.dom.menuItems) { return; }

        for (var i = kickstart.dom.menuItems.length - 1; i >= 0; i--) {

            // remove active class from items
            kickstart.dom.menuItems[i].classList.remove('t-active');

            // get item href
            href = kickstart.dom.menuItems[i].getAttribute('href');

            // get id
            if (href.indexOf('#') > -1) {
                id = href.split('#').pop();
            } else {
                id = href.split('/').pop().replace(/\.[^/.]+$/, '');
            }

            console.log('in parsedItems - id: ', id);

            items.push(id);

        }

        return items.reverse();

    };


    /**
     * Match the 'id' in the window location with the menu item, set menu item as active
     */
    var setActive = function () {

        var href = window.location.href,
            items = parsedItems(),
            id, index;



        if (!items || !items.length) { return; }
        // get window 'id'
        if (href.indexOf('#') > -1) {
            id = window.location.hash.replace('#', '');
        } else {
            id = window.location.pathname.split('/').pop().replace(/\.[^/.]+$/, '');
        }

        console.log('id', id);

        // find the window id in the items array
        index = (items.indexOf(id) > -1) ? items.indexOf(id) : 0;

        // set the matched item as active
        kickstart.dom.menuItems[index].classList.add('t-active');

    };

    window.addEventListener('hashchange', setActive);

    setActive();

    return this;

};


/**
 * Click handler to primary menu toggle
 * @return {Object} kickstart
 */
kickstart.primaryMenuControls = function () {
    var domBody = document.querySelector('.t-body'),
        activeStateClass = 'state--menu-active',
        toggle = kickstart.dom.menuToggle || {},
        menuItems = kickstart.dom.menuItems || [];

    // toggle classes on certain elements
    var toggleClasses = function () {
        domBody.classList.toggle(activeStateClass);
    };

    // toggle classes on click
    toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleClasses();
    });

    // close menu when clicking on item (for collapsed menu view)
    var closeMenu = function () {

        if ( this === document && !domBody.classList.contains(activeStateClass) ) {
            return false;
        }

        toggleClasses();
    };

    for (var i = 0; i < menuItems.length; i++) {
        menuItems[i].addEventListener('click', closeMenu);
    }

    document.addEventListener('click', closeMenu);

    return this;

};


/**
 * Handler for preview and code toggles
 * @return {Object} kickstart
 */
kickstart.allItemsToggles = function () {

    var items = {
        details: document.querySelectorAll('[data-t-toggle="details"]'),
        notes: document.querySelectorAll('[data-t-toggle="notes"]'),
        code: document.querySelectorAll('[data-t-toggle="code"]')
    };

    var toggleAllControls = document.querySelectorAll('.t-controls [data-t-toggle-control]');

    var options = (kickstart.test.localStorage) ? JSON.parse(localStorage.kickstart) : kickstart.options;

    // toggle all
    var toggleAllItems = function (type, value) {

        var button = document.querySelector('.t-controls [data-t-toggle-control=' + type + ']'),
            _items = items[type];

        for (var i = 0; i < _items.length; i++) {
            if (value) {
                _items[i].classList.remove('t-item-hidden');
            } else {
                _items[i].classList.add('t-item-hidden');
            }
        }

        // toggle styles
        if (button) {
            if (value) {
                button.classList.add('t-active');
            } else {
                button.classList.remove('t-active');
            }
        }

        // update options
        options.toggles[type] = value;

        if (kickstart.test.localStorage) {
            localStorage.setItem('kickstart', JSON.stringify(options));
        }

    };

    for (var i = 0; i < toggleAllControls.length; i++) {

        toggleAllControls[i].addEventListener('click', function (e) {

            // extract info from target node
            var type = e.currentTarget.getAttribute('data-t-toggle-control'),
                value = e.currentTarget.className.indexOf('t-active') < 0;

            // toggle the items
            toggleAllItems(type, value);

        });

    }

    // persist toggle options from page to page
    for (var toggle in options.toggles) {
        if (options.toggles.hasOwnProperty(toggle)) {
            toggleAllItems(toggle, options.toggles[toggle]);
        }
    }

    return this;

};


/**
 * Handler for single item code toggling
 */
kickstart.singleAdditionalInfoToggle = function () {

    var itemToggleSingle = document.querySelectorAll('.ks-pattern-addl-toggle');

    if (!itemToggleSingle.length) { return this; }
    // toggle single
    var toggleSingleItemCode = function (e) {
        e.preventDefault();

        var elToShowId = this.getAttribute('href');
        var elToShow = document.getElementById(elToShowId.replace('#', ''));
        
        this.classList.toggle('ks-is-active');
        elToShow.classList.toggle('ks-is-active');
    };

    Array.prototype.forEach.call(itemToggleSingle, function(item) {
        item.addEventListener('click', toggleSingleItemCode, true);
    });

    return this;

};


/**
 * Automatically select code when code block is clicked
 */
kickstart.bindCodeAutoSelect = function () {

    var codeBlocks = document.querySelectorAll('.t-item-code');

    var select = function (block) {
        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(block.querySelector('code'));
        selection.removeAllRanges();
        selection.addRange(range);
    };

    for (var i = codeBlocks.length - 1; i >= 0; i--) {
        codeBlocks[i].addEventListener('click', select.bind(this, codeBlocks[i]));
    }

};

kickstart.sizeIframe = function(size, animate) {
    var theSize;
    var viewport;
    var minViewportWidth = 240, //Minimum Size for Viewport
        maxViewportWidth = 2600; //Maxiumum Size for Viewport

    viewport = document.getElementById('ks-viewport');

    if (!viewport) { return this; }

    if (size > maxViewportWidth) {
        theSize = maxViewportWidth;
    }
    else if (size < minViewportWidth) {
        theSize = minViewportWidth;
    } else {
        theSize = size;
    }

    viewport.setAttribute('style', 'width:' + theSize + 'px');

    return this;
};

kickstart.setIframeSource = function() {
    var viewport;
    var iFramePath;

    viewport = document.getElementById('ks-viewport');

    if (!viewport) { return this; }

    iFramePath = window.location.protocol + "//" + window.location.host + window.location.pathname.replace('index.html', '') + 'kickstart/html/styleguide.html';

    viewport.contentWindow.location.replace(iFramePath);

    return this;
};

kickstart.bindNavigationEvents = function() {
    var headerEl = document.querySelector('.ks-header');
    var navEl = document.querySelector('.ks-navigation');

    if (!navEl) { return this; }

    var navLinks = document.querySelectorAll('.ks-navLink');
    var viewport = document.getElementById('ks-viewport');

    navLinks = Array.prototype.slice.call(navLinks, 0);

    this.handleLinkClick = function(event) {
        var iFramePath;
        var hrefVal = event.target.getAttribute('href');

        event.preventDefault();

        navLinks.forEach(function(link) {
            link.classList.remove('ks-navLink--active');
        });

        event.target.classList.toggle('ks-navLink--active');

        if (event.target.className.indexOf('ks-navLink--active') > -1) {
            document.body.classList.add('ks-header--expanded');
        }
        else {
            document.body.classList.remove('ks-header--expanded');
        }

        //handle hash links
        if (hrefVal.indexOf('#') === 0) {
            iFramePath = window.location + hrefVal;
            viewport.contentWindow.location.replace(iFramePath);
        }
        else if (navLinks.indexOf(event.target) > -1) {
            
            if (hrefVal === '/') {
                hrefVal = 'kickstart/html/styleguide.html';
            }

            iFramePath = window.location.protocol + "//" + window.location.host + '/' + hrefVal;

            viewport.contentWindow.location.replace(iFramePath);
        }
    }

    navEl.addEventListener("click", this.handleLinkClick.bind(this), false);

    return this;
};

kickstart.bindPatternLinkEvents = function() {

    var patternLinks = document.querySelectorAll('.ks-patternLink');
    var viewport = document.getElementById('ks-viewport');

    if (!patternLinks.length) { return this; }

    patternLinks = Array.prototype.slice.call(patternLinks, 0);

    this.handlePatternLinkClick = function(event) {
        // var hrefVal = event.target.getAttribute('href');
        // var hash = hrefVal.split('#')[1];
        // var iFramePath;

        // event.preventDefault();

        // if (hash) {
        //     var windowFrame = window.frameElement;
        //     iFramePath = window.location.protocol + "//" + window.location.host + hrefVal;
        //     windowFrame.contentWindow.location.replace(iFramePath);
        // }
    }

    document.addEventListener("click", this.handlePatternLinkClick.bind(this), false);

    return this;
};


/**
 * Initialization
 */
(function () {
    var initialIframeWidth = kickstart.dom.window.innerWidth || kickstart.dom.documentEl.clientWidth || kickstart.dom.body.clientWidth;

    // invoke
    kickstart
        //.primaryMenuControls()
        //.allItemsToggles()
        .singleAdditionalInfoToggle()
        //.buildColorChips()
        .bindNavigationEvents()
        .bindPatternLinkEvents()
        .sizeIframe(initialIframeWidth)
        .setIframeSource()
        .setActiveItem()
        .bindCodeAutoSelect();

    // syntax highlighting
    Prism.highlightAll();

}());