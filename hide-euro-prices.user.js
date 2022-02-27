// ==UserScript==
// @name        hide-euro-prices
// @version     1.4
// @author      DoomDesign, Rotzbua
// @include     http*://*amazon*/*
// @description Hides (hopefully) all price elements on amazon
// @run-at      document-start
// @grant       GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    //========================================================================================
    // Configuration.
    //========================================================================================
    const enableLoadingScreen = true; // Enable full sized loading screen to prevent price leak while loading.
    const loadingScreenBackgroundColor = 'yellow'; // Background color of loading screen.
    const textToSearch = '(EUR|€)'; // Regex to find price.

    //========================================================================================
    // Globals.
    //========================================================================================
    let pricesHidden = true;
    let priceElems = [];
    let timeout;

    //========================================================================================
    // Loading screen.
    //========================================================================================
    const SENF = '' +
        '    ___________    \n' +
        '   [___________]   \n' +
        '   /           \\   \n' +
        '  /~~^~^~^~^~^~^\\  \n' +
        ' /===============\\ \n' +
        ';  _   _       _  ;\n' +
        '| |_  |_ |\\ | |_  |\n' +
        ';  _| |_ | \\| |   ;\n' +
        ' \\===============/ \n' +
        '  \\             /  \n' +
        '   `"""""""""""`   ';

    const loadingScreenHTMLID = 'x-loading-screen';

    const loadingScreenHTML = '<div id=\'' + loadingScreenHTMLID + '\' ' +
        'style=\'position:fixed;top:0px;left:0px;width:100%;height:100%;background:'+loadingScreenBackgroundColor+';z-index:99999;font-family:"courier-new",monospace;font-size:xx-large;text-align: center;vertical-align: middle;display: flex;align-items: center;justify-content: center;\' title="Blickschutz">' +
        '<div><h1>!!! Vorsicht !!!</h1>Senfmaschine arbeitet!<br><br>' +
        '<pre>' + SENF + '</pre>' +
        '<br><br><button onclick="document.getElementById(\'' + loadingScreenHTMLID + '\')?.remove();" style="font-size:large;">X Notaus</button>' +
        '</div>' +
        '</div>';

    const addLoadingScreen = () => {
        if (!enableLoadingScreen) return;
        document.body.insertAdjacentHTML('beforeend', loadingScreenHTML);
    };
    const removeLoadingScreen = () => {
        document.getElementById(loadingScreenHTMLID)?.remove();
    };
    //========================================================================================
    // Style definition.
    //========================================================================================
    const customCSS = 'button.showPrices {line-height: 1; padding: 10px; position: fixed; bottom: 1rem; right: 1rem; z-index: 9999; color: #000; background-color: #fff; font-size: 1.5rem; border: 1px solid red; border-radius: 5px;} button.showPrices:active, button.showPrices.active {background-color: red; color: #fff;} button.showPrices > small { display: block;} .hiddenByScript.visibleByScript {visibility: initial !important} .hiddenByScript.visibleByScript::after { opacity: 0; } .hiddenByScript {position: relative;} .hiddenByScript {visibility: hidden !important} /*.hiddenByScript::after {content: \'???\'; visibility: visible; font-weight: bold; font-family: \'Amazon Ember\', Arial, sans-serif; color: #fff; opacity: 1; display: block; position: absolute; top: 0; right: 0; bottom: 0; left: 0; background-color: #000; overflow: hidden; text-align: center;}*/';
    const isCustomCSSAddable = () => {
        return !!(document.head || document.documentElement);
    };
    const addCustomCSS = () => {
        (document.head || document.documentElement).insertAdjacentHTML('beforeend', '<style>' + customCSS + '</style>');
    };

    //========================================================================================
    // Price filter.
    //========================================================================================
    /**
     * @param {Node} el
     * @see https://stackoverflow.com/a/10730777
     */
    const textNodesUnder = (el) => {
        let n, a = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        while (n = walk.nextNode()) a.push(n);
        return a;
    };

    // mutation observer to directly add classes to elements with "price" in class names on page load
    /**
     * @param {Node|ParentNode} elm
     */
    const filterPriceElement = (elm) => {
        if (elm.nodeName !== '#text' && typeof elm.querySelectorAll === 'function') {

            // find all nodes that contain a certain text
            // find all text nodes in elm
            const textNodes = textNodesUnder(elm);
            // iterate over text node
            textNodes.forEach((value) => {
                if (value.nodeType === Node.TEXT_NODE && RegExp(textToSearch).test(value.textContent)) {
                    /* get parent element of textNode */
                    const parent = value.parentNode;
                    parent.classList.add('hiddenByScript');
                    priceElems.push(parent);
                }
            });

            // Additionally find all nodes with a specific class.
            const classNodes = elm.querySelectorAll('[class*=\'price\'], [class*=\'prices\'], [class*=\'Price\']');
            classNodes.forEach(function(value) {
                value.classList.add('hiddenByScript');
                priceElems.push(value);
            });

            // NEW: hide promo iframe and placement elements completely and don't add it to the revealable elements
            const iframeNodes = document.querySelectorAll(
                '[id*=\'hero-quick-promo\']:not(.hiddenByScript), [data-cel-widget*=\'placement\']:not(.hiddenByScript), [data-ad-details]:not(.hiddenByScript)');
            iframeNodes.forEach(function(value) {
                value.classList.add('hiddenByScript');
                value.style.display = 'none';
            });
        }
    };

    const priceMutationObserverSettings = {
        attributes: false, characterData: false, childList: true, subtree: true, attributeOldValue: false, characterDataOldValue: false,
    };
    const priceMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && 0 < mutation.addedNodes.length) {
                mutation.addedNodes.forEach(filterPriceElement);
            }
        });
    });

    //========================================================================================
    // ======  Execution part. ======
    //========================================================================================
    // Adding loading screen to prevent leaking price if DOM is preloaded. Hiding prices takes some time.
    const bodyMutationObserver = new MutationObserver((mutations, observer) => {
        if (document.body) {
            observer.disconnect();
            addLoadingScreen();
        }
    });
    bodyMutationObserver.observe(document, {childList: true, subtree: true});

    // Insert custom CSS.
    // Workaround: sometimes just document exists without needed children.
    // Source: https://github.com/greasemonkey/greasemonkey/issues/2996#issuecomment-906608348
    if (isCustomCSSAddable()) addCustomCSS(); else {
        const headMutationObserver = new MutationObserver((mutations, observer) => {
            if (isCustomCSSAddable()) {
                observer.disconnect();
                addCustomCSS();
            }
        });
        headMutationObserver.observe(document, {childList: true});
    }

    // Attach price observer to `document`.
    priceMutationObserver.observe(document, priceMutationObserverSettings);
    // Race condition: if there is already more than default DOM generated, then we miss some prices.
    // So filter already existing DOM.
    filterPriceElement(document);

    document.addEventListener('DOMContentLoaded', () => {
        removeLoadingScreen();

        // Create toggle button.
        const button = document.createElement('button');
        button.innerHTML = 'Preise anzeigen/ausblenden';
        button.classList.add('showPrices');
        button.onclick = () => {
            clearInterval(timeout);
            if (pricesHidden === true) {
                console.log('Showing...');
                pricesHidden = false;
                button.classList.add('active');
                timeout = setInterval(function() {
                    priceElems.forEach(function(elm) {
                        elm.classList.add('visibleByScript');
                    });
                }, 500);

                return false;
            } else {
                console.log('Hiding...');
                pricesHidden = true;
                button.classList.remove('active');
                priceElems.forEach(function(elm) {
                    elm.classList.remove('visibleByScript');
                });
            }
        };
        document.body.appendChild(button);
    });

})();
