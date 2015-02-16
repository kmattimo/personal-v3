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
    primaryMenu: document.querySelector('.t-sidebar__menu'),
    menuItems: document.querySelectorAll('.t-sidebar__menu a'),
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

            items.push(id);

        }

        console.log(items);

        return items.reverse();

    };


    /**
     * Match the 'id' in the window location with the menu item, set menu item as active
     */
    var setActive = function () {

        var href = window.location.href,
            items = parsedItems(),
            id, index;

        // get window 'id'
        if (href.indexOf('#') > -1) {
            id = window.location.hash.replace('#', '');
        } else {
            id = window.location.pathname.split('/').pop().replace(/\.[^/.]+$/, '');
        }

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
kickstart.singleItemToggle = function () {

    var itemToggleSingle = document.querySelectorAll('.t-toggle');

    // toggle single
    var toggleSingleItemCode = function (e) {
        var group = this.parentNode.parentNode.parentNode,
            type = e.currentTarget.getAttribute('data-t-toggle-control'),
            codeItems;

        if ( !!(group && group.nodeType === 1) )
        {
            codeItems = group.querySelectorAll('[data-t-toggle=' + type + ']');

            Array.prototype.forEach.call(codeItems, function(item) {
                item.classList.toggle('t-item-hidden');
            });
        }
    };

    Array.prototype.forEach.call(itemToggleSingle, function(item) {
        item.addEventListener('click', toggleSingleItemCode);
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


/**
 * Initialization
 */
(function () {

    // invoke
    kickstart
        .primaryMenuControls()
        .allItemsToggles()
        .singleItemToggle()
        .buildColorChips()
        .setActiveItem()
        .bindCodeAutoSelect();

    // syntax highlighting
    Prism.highlightAll();

}());