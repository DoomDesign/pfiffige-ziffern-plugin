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

    var regTextToSearch = /(EUR|€)/;
    var priceElems = [];
    var pricesHidden = true;

    // see https://stackoverflow.com/a/10730777
    function textNodesUnder(el){
        var n, a=[], walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
        while(n=walk.nextNode()) a.push(n);
        return a;
    }

    // insert CSS
    var cssString =
        `<style type='text/css'>
            button.showPrices {
                line-height: 1;
                padding: 10px;
                position: fixed;
                bottom: 1rem; right: 1rem;
                z-index: 9999; color: #000;
                background-color: #fff;
                font-size: 1.5rem;
                border: 1px solid red;
                border-radius: 5px;
            }
            button.showPrices:active, button.showPrices.active {
                background-color:
                red; color: #fff;
            }
            button.showPrices > small { display: block; }

            .hiddenByScript.visibleByScript { visibility: initial !important }
            .hiddenByScript.visibleByScript::after { opacity: 0; }
            .hiddenByScript {position: relative;}
            .hiddenByScript {visibility: hidden !important}
            /*.hiddenByScript::after {content: '???'; visibility: visible; font-weight: bold; font-family: 'Amazon Ember', Arial, sans-serif; color: #fff; opacity: 1; display: block; position: absolute; top: 0; right: 0; bottom: 0; left: 0; background-color: #000; overflow: hidden; text-align: center;}*/
        </style>`;

    // mutation observer to directly add classes to elements with "price" in class names on page load
    new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if ( mutation.type == 'childList' ) {
                if (mutation.addedNodes.length >= 1) {
                    mutation.addedNodes.forEach(function(elm) {
                        if (elm.nodeName === '#text' || !elm.querySelectorAll) {
                            return;
                        }

                        //find all nodes that contain a certain text
                        // find all text nodes in elm
                        var textnodes = textNodesUnder(elm);
                        // iterate over text node
                        textnodes.forEach(function(value){
                            if(value.nodeType === Node.TEXT_NODE && regTextToSearch.test(value.textContent)) {
                                /* get parent element of textNode */
                                var parent = value.parentNode;
                                parent.classList.add('hiddenByScript');
                                parent.style.visibility = "hidden";
                                priceElems.push(parent);
                            }
                        });

                        // additionally find all nodes with a specific class
                        var classnodes = elm.querySelectorAll("[class*='price'], [class*='prices'], [class*='Price']");
                        classnodes.forEach(function(value){
                                value.classList.add('hiddenByScript');
                                value.style.visibility = "hidden";
                                priceElems.push(value);
                        });

                        // NEW: hide promo iframe and placement elements completely and don't add it to the revealable elements
                        document.querySelectorAll("[id*='hero-quick-promo']:not(.hiddenByScript), [data-cel-widget*='placement']:not(.hiddenByScript), [data-ad-details]:not(.hiddenByScript)").forEach(function(value) {
                            value.classList.add('hiddenByScript');
                            value.style.display = 'none';
                        });
                    });
                }
            }
        })
    }).observe(document, {
        attributes: false,
        characterData: false,
        childList: true,
        subtree: true,
        attributeOldValue: false,
        characterDataOldValue: false
    });

    // create toggle button
    document.addEventListener("DOMContentLoaded", function() {
        var button = document.createElement("button");
        document.head.insertAdjacentHTML('beforeend',cssString);

        button.textContent = "Preise anzeigen";
        button.classList.add('showPrices');
        button.onclick = function(){
            if(pricesHidden === true) {
                priceElems.forEach(function(elm) {
                    elm.classList.add('visibleByScript');
                });

            } else {
                priceElems.forEach(function(elm) {
                    elm.classList.remove('visibleByScript');
                });
            }

            button.textContent = ["Preise anzeigen", "Preise ausblenden"][+pricesHidden];
            pricesHidden = !pricesHidden;
            button.classList.toggle('active');
        }
        document.body.appendChild(button);
    });

})();
