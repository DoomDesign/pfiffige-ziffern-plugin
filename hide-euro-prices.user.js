// ==UserScript==
// @name        hide-euro-prices
// @version     1.5
// @author      DoomDesign
// @include     http*://*amazon*/*
// @description Hides (hopefully) all price elements on amazon
// @run-at      document-start
// @grant       GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    var textToSearch = '(EUR|€|Euro|Euros)';
    var priceElems = [];
    var timeout;
    var pricesHidden = true;

    // see https://stackoverflow.com/a/10730777
    function textNodesUnder(el){
        var n, a=[], walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null,false);
        while(n=walk.nextNode()) a.push(n);
        return a;
    }

    // insert CSS
    (document.head || document.documentElement).insertAdjacentHTML('beforeend',
`
<style type="text/css">
  button.showPrices {
    line-height: 1;
    padding: 10px;
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    z-index: 9999;
    color: #000;
    background-color: #fff;
    font-size: 1.5rem;
    border: 1px solid red;
    border-radius: 5px;
  }
  button.showPrices:active,
  button.showPrices.active {
    background-color: red;
    color: #fff;
  }
  button.showPrices > small {
    display: block;
  }
  .hiddenByScript.visibleByScript {
    filter: initial !important;
    user-select: initial !important;
  }
  .hiddenByScript {
    position: relative;
  }
  .hiddenByScript {
    filter: blur(10px) !important;
    user-select: none !important;
  }
  .hiddenByScript:not(.visibleByScript)::after{
    position: absolute;
    content: '????????' !important;
    width: 100%;
    height: 100%;
    min-width: 10ch;
    top: 0;
    left: 0;
  }
</style>

`);
    // mutation observer to directly add classes to elements with "price" in class names on page load
    new MutationObserver(function(mutations) {

        mutations.forEach(function(mutation) {

            if ( mutation.type == 'childList' ) {
                if (mutation.addedNodes.length >= 1) {
                    mutation.addedNodes.forEach(function(elm) {
                        if (elm.nodeName != '#text') {
                            if(typeof elm.querySelectorAll === "function") {

                                //find all nodes that contain a certain text
                                // find all text nodes in elm
                                var textnodes = textNodesUnder(elm);

                                // iterate over text node
                                textnodes.forEach(function(value){
                                    if(value.nodeType === Node.TEXT_NODE && RegExp(textToSearch).test(value.textContent)) {

                                        /* get parent element of textNode */
                                        var parent = value.parentNode;

                                        // don't add twice
                                        if(priceElems.indexOf(parent) > -1) {
                                            return;
                                        }

                                        parent.classList.add('hiddenByScript');
                                        priceElems.push(parent);
                                    }
                                });

                                // additionally find all nodes with a specific class
                                var classnodes = elm.querySelectorAll("[class*='price'], [class*='prices'], [class*='Price']");
                                classnodes.forEach(function(value){
                                        value.classList.add('hiddenByScript');
                                        priceElems.push(value);
                                });

                                // NEW: hide promo iframe and placement elements completely and don't add it to the revealable elements
                                document.querySelectorAll("[id*='hero-quick-promo']:not(.hiddenByScript), [data-cel-widget*='placement']:not(.hiddenByScript), [data-ad-details]:not(.hiddenByScript)").forEach(function(value) {
                                    value.classList.add('hiddenByScript');
                                    value.style.display = 'none';
                                });
                            };
                        }
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
        button.innerHTML = "Preise anzeigen/ausblenden";
        button.classList.add('showPrices');
        button.onclick = function(){
            clearInterval(timeout);
            if(pricesHidden === true) {
                console.log("Showing...");
                pricesHidden = false;
                button.classList.add('active');
                timeout = setInterval(function() {

                    priceElems.forEach(function(elm) {
                        elm.classList.add('visibleByScript');
                    });
                }, 500);

                return false;
            } else {
                console.log("Hiding...");
                pricesHidden = true;
                button.classList.remove('active');
                priceElems.forEach(function(elm) {
                    elm.classList.remove('visibleByScript');
                });
            }
        }
        document.body.appendChild(button);
    });

})();
