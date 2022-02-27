// ==UserScript==
// @name        hide-euro-prices
// @version     1.3
// @author      DoomDesign
// @include     http*://*amazon*/*
// @description Hides (hopefully) all price elements on amazon
// @run-at      document-start
// @grant       GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const textToSearch = '(EUR|€)';
    let priceElems = [];
    let timeout;
    let pricesHidden = true;

    // see https://stackoverflow.com/a/10730777
    function textNodesUnder(el) {
        let n, a = [],
            walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null,
                false);
        while (n = walk.nextNode()) a.push(n);
        return a;
    }

    // insert CSS
    (document.head || document.documentElement).insertAdjacentHTML('beforeend',
        '<style type=\'text/css\'> button.showPrices {line-height: 1; padding: 10px; position: fixed; bottom: 1rem; right: 1rem; z-index: 9999; color: #000; background-color: #fff; font-size: 1.5rem; border: 1px solid red; border-radius: 5px;} button.showPrices:active, button.showPrices.active {background-color: red; color: #fff;} button.showPrices > small { display: block;} .hiddenByScript.visibleByScript {visibility: initial !important} .hiddenByScript.visibleByScript::after { opacity: 0; } .hiddenByScript {position: relative;} .hiddenByScript {visibility: hidden !important} /*.hiddenByScript::after {content: \'???\'; visibility: visible; font-weight: bold; font-family: \'Amazon Ember\', Arial, sans-serif; color: #fff; opacity: 1; display: block; position: absolute; top: 0; right: 0; bottom: 0; left: 0; background-color: #000; overflow: hidden; text-align: center;}*/ </style>');

    // mutation observer to directly add classes to elements with "price" in class names on page load
    new MutationObserver(function(mutations) {

        mutations.forEach(function(mutation) {

            if (mutation.type === 'childList') {
                if (mutation.addedNodes.length >= 1) {
                    mutation.addedNodes.forEach(function(elm) {
                        if (elm.nodeName !== '#text') {

                            if (typeof elm.querySelectorAll === 'function') {

                                //find all nodes that contain a certain text
                                // find all text nodes in elm
                                const textnodes = textNodesUnder(elm);
                                // iterate over text node
                                textnodes.forEach(function(value) {
                                    if (value.nodeType === Node.TEXT_NODE &&
                                        RegExp(textToSearch).
                                            test(value.textContent)) {
                                        /* get parent element of textNode */
                                        const parent = value.parentNode;
                                        parent.classList.add('hiddenByScript');
                                        priceElems.push(parent);
                                    }
                                });

                                // additionally find all nodes with a specific class
                                const classnodes = elm.querySelectorAll(
                                    '[class*=\'price\'], [class*=\'prices\'], [class*=\'Price\']');
                                classnodes.forEach(function(value) {
                                    value.classList.add('hiddenByScript');
                                    priceElems.push(value);
                                });

                                // NEW: hide promo iframe and placement elements completely and don't add it to the revealable elements
                                document.querySelectorAll(
                                    '[id*=\'hero-quick-promo\']:not(.hiddenByScript), [data-cel-widget*=\'placement\']:not(.hiddenByScript), [data-ad-details]:not(.hiddenByScript)').
                                    forEach(function(value) {
                                        value.classList.add('hiddenByScript');
                                        value.style.display = 'none';
                                    });
                            }

                        }
                    });
                }
            }
        });
    }).observe(document, {
        attributes: false,
        characterData: false,
        childList: true,
        subtree: true,
        attributeOldValue: false,
        characterDataOldValue: false,
    });

    // create toggle button
    document.addEventListener('DOMContentLoaded', function() {
        const button = document.createElement('button');
        button.innerHTML = 'Preise anzeigen/ausblenden';
        button.classList.add('showPrices');
        button.onclick = function() {
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
