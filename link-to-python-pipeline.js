// ==UserScript==
// @name         Link to Python pipeline
// @namespace    http://tampermonkey.net/
// @version      2024-05-29
// @description  Add links to go to the Python pipeline
// @author       kineolyan
// @match        https://app.circleci.com/pipelines/github/activeviam/activepivot/*/workflows/*/jobs/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const debug = (false /* debug */)
      ? (...parts) => console.log('[monkey]:', ...parts)
      : () => {};

    const checkJobTitle = () => {
        const es = document.querySelectorAll('h1');
        if (es.length == 0) {
            return null;
        } else {
            return Array.from(es).some(e => e.textContent.includes('run_atoti_python_api_ci'));
        }
    };

    const createState = () => ({
        pythonPage: null,
        linksAdded: false,
        location: document.location.href,
    });

    (new MutationObserver(check)).observe(document, {childList: true, subtree: true});

    let state = createState();
    function check(changes, observer) {
        const currentLocation = document.location.href;
        if (state.location !== currentLocation) {
            state = createState();
        }

        if (state.linksAdded) {
            return; // Nothing to do
        }

        if (state.pythonPage === null) {
            const checkPage = checkJobTitle();
            if (checkPage !== null) {
                debug('page type found', checkPage);
                state.pythonPage = checkPage;
            }
        }
        if (state.pythonPage === true) {
            const pipelineBlock = findPipelineBlock();
            if(pipelineBlock) {
                const outputBlock = findStepOutput(pipelineBlock);
                if (outputBlock) {
                    debug("found something to do", outputBlock);
                    const link = findLinkToPipeline(outputBlock);
                    debug('Found link =', link);
                    addLinks(link);
                    state.linksAdded = true;
                }
            }
        }
    }

    const findPipelineBlock = () => {
        const ds = document.querySelectorAll("button[data-cy='step-name'] > div#metadata > div");
        const found = Array.from(ds).filter(e => e.textContent.includes("Atoti") && e.textContent.includes('pipeline') && e.textContent.includes('Check'));
        if (found.length >  0) {
            debug("found", found);
            const element = found[0];
            const parent = rollbackToParent(element, e => e.getAttribute('data-cy') === 'step-name');
            return parent.parentElement;
        } else {
            return null;
        }
    };

    const findStepOutput = (element) => {
        const es = element.querySelectorAll("div[data-cy='step-output']");
        if (es.length > 0) {
            return es[0];
        } else {
            return null;
        }
    };

    const findLinkToPipeline = (element) => {
        const es = element.querySelectorAll("pre span");
        const pattern = /created pipeline here : (https:\S+)/;
        const found = Array.from(es)
          .map(e => pattern.exec(e.textContent))
          .filter(e => e !== null);
        if (found.length > 0) {
            return found[0][1];
        } else {
            return null;
        }
    };

    const rollbackToParent = (element, f) => {
        //console.log("testing", element);
        for (
            let parent = element.parentElement;
            parent;
            parent = parent.parentElement) {
            //console.log('testing parent', parent);
            if (f(parent)) {
                return parent;
            }
        }
        return null;
    };

    const addLinks = (url) => {
        const stepElts = document.querySelectorAll('div[tabindex] > button[data-cy="step-name"]');
        if (stepElts.length == 0) {
            console.warn('[monkey] no steps found');
            return;
        }
        const parent = stepElts[0].parentElement.parentElement;
        parent.insertBefore(createLink(url), stepElts[0].parentElement);
        parent.appendChild(createLink(url));
    };

    const createLink = (url) => {
        const elt = document.createElement('a');
        elt.href = url;
        elt.target = '_blank';
        elt.textContent = '🐍 Go to Python pipeline';
        return elt;
    };
})();
