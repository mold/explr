/* requires:
aria-announcer.js
search.js
*/

const keyboardMode = keyboardMode || {};

const MIN_ZOOM_LEVEL_FOR_KEYBOARD_MODE = 7;
const MAX_COUNTRY_SUGGESTIONS = 20;
let KEYBOARD_MODE_ACTIVE = false;
// Use numbers 1–99 for country shortcuts
const NUMBER_POOL = Array.from({length: 99}, (_, i) => (i + 1).toString());

let visibleCountries = [];
let keyBuffer = '';
let keyBufferTimer = null;
let keyboardModeActive = false;
let isKeyboardModeEnabled = false;
let currentFocus = null;

// Add a list of country IDs to exclude from keyboard mode
const EXCLUDED_COUNTRY_IDS = [
  831, // Jersey
  832, // Guernsey
  833, // Isle of Man
  136, // Cayman Islands
  796, // Turks and Caicos Islands
];

// Add a map to store country-to-number assignments
let countryNumberMap = {};

// Buffer for multi-digit number input
let numberBuffer = '';
let numberBufferTimer = null;
const NUMBER_BUFFER_TIMEOUT = 1000; // ms

const handleNumberKeyPress = (e) => {
    // Only handle number keys, and not if in an input
    if (!e.key.match(/^[0-9]$/) || e.target.tagName === "INPUT") return;
    if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;

    numberBuffer += e.key;
    // Remove leading zeros
    numberBuffer = numberBuffer.replace(/^0+/, '');

    // If buffer is empty or >2 digits, reset
    if (!numberBuffer || numberBuffer.length > 2) {
        numberBuffer = '';
        return;
    }

    // If two digits, try to select immediately
    if (numberBuffer.length === 2) {
        const targetCountryId = Object.keys(countryNumberMap).find(
            id => countryNumberMap[id] === numberBuffer
        );
        if (targetCountryId) {
            const targetCountry = visibleCountries.find(country => country.id === targetCountryId);
            if (targetCountry) {
                // Find the corresponding SVG country element using D3
                const svgCountry = d3.select(`#${targetCountry.id}`).node();
                if (svgCountry) {
                    svgCountry.dispatchEvent(new Event('click'));
                    keyboardMode.cleanup();
                }
                ga('send', {
                    hitType: 'event',
                    eventCategory: 'Keyboard',
                    eventAction: 'Opened country',
                    eventLabel: 'test'
                });
            }
            numberBuffer = '';
            clearTimeout(numberBufferTimer);
            numberBufferTimer = null;
            return;
        }
        // If not valid, wait for timeout and then clear
        clearTimeout(numberBufferTimer);
        numberBufferTimer = setTimeout(() => {
            numberBuffer = '';
        }, NUMBER_BUFFER_TIMEOUT);
        return;
    }

    // If single digit, check if any two-digit number starting with this digit is assigned
    const hasTwoDigit = Object.values(countryNumberMap).some(num => num.length === 2 && num.startsWith(numberBuffer));
    if (!hasTwoDigit) {
        // No possible two-digit, select immediately if valid
        const targetCountryId = Object.keys(countryNumberMap).find(
            id => countryNumberMap[id] === numberBuffer
        );
        if (targetCountryId) {
            const targetCountry = visibleCountries.find(country => country.id === targetCountryId);
            if (targetCountry) {
                // Find the corresponding SVG country element using D3
                const svgCountry = d3.select(`#${targetCountry.id}`).node();
                if (svgCountry) {
                    svgCountry.dispatchEvent(new Event('click'));
                    keyboardMode.cleanup();
                }
                ga('send', {
                    hitType: 'event',
                    eventCategory: 'Keyboard',
                    eventAction: 'Opened country',
                    eventLabel: 'test'
                });
            }
            numberBuffer = '';
            clearTimeout(numberBufferTimer);
            numberBufferTimer = null;
            return;
        }
    }
    // Otherwise, wait for next digit or timeout
    clearTimeout(numberBufferTimer);
    numberBufferTimer = setTimeout(() => {
        // If still single digit and valid, select now
        if (numberBuffer.length === 1) {
            const targetCountryId = Object.keys(countryNumberMap).find(
                id => countryNumberMap[id] === numberBuffer
            );
            if (targetCountryId) {
                const targetCountry = visibleCountries.find(country => country.id === targetCountryId);
                if (targetCountry) {
                    // Find the corresponding SVG country element using D3
                    const svgCountry = d3.select(`#${targetCountry.id}`).node();
                    if (svgCountry) {
                        svgCountry.dispatchEvent(new Event('click'));
                        keyboardMode.cleanup();
                    }
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Keyboard',
                        eventAction: 'Opened country',
                        eventLabel: 'test'
                    });
                }
            }
        }
        numberBuffer = '';
    }, NUMBER_BUFFER_TIMEOUT);
};

function getCurrentlyVisibleCountries() {
    const userName = window.location.href.split("username=")[1];
    let data = script.getCurrentData();
    // return an array consisting of objects with the country name in plain text + the index number of the country
    let formattedCountries = [];
    
    // Add null checks and error handling
    if (!data || !userName) {
        console.warn('Data or username not available');
        return formattedCountries;
    }

    visibleCountries.forEach((country) => {
        const countryId = parseInt(country.id.slice(1));
        
        // Skip excluded country IDs
        if (EXCLUDED_COUNTRY_IDS.includes(countryId)) {
            return;
        }
        
        const number = countryNumberMap[country.id];
        
        // Add null checks for data[countryId] and data[countryId][userName]
        const artistCount = data[countryId] && data[countryId][userName] ? 
            data[countryId][userName].length : 0;
            
        // Only add countries that have a valid name
        const countryName = utils.getCountryNameFromId(countryId);
        if (countryName && countryName !== "undefined") {
            formattedCountries.push({
                name: countryName,
                number: number,
                artistCount: artistCount,
                id: countryId
            });
        }
    });
    return formattedCountries;
}

function isInViewport(element) {
    // Get country ID from the element
    const countryId = parseInt(element.id.slice(1));
    
    // Skip excluded country IDs
    if (EXCLUDED_COUNTRY_IDS.includes(countryId)) {
        return false;
    }
    
    // Check if we have an override for this country in map.COUNTRY_BBOX_OVERRIDES
    if (map.COUNTRY_BBOX_OVERRIDES && map.COUNTRY_BBOX_OVERRIDES[countryId]) {
        // For countries with multiple boxes (like USA), check if any box is visible
        const overrides = map.COUNTRY_BBOX_OVERRIDES[countryId];
        const boxArray = Array.isArray(overrides[0]) ? overrides : [overrides];
        
        return boxArray.some(bbox => isBBoxInViewport(bbox));
    }
    
    // Fall back to the current implementation for countries without overrides
    const rect = element.getBoundingClientRect();

    // Define the dimensions of the rectangle
    const rectangleWidth = 400;
    const rectangleHeight = 400;

    // Calculate the position of the rectangle
    const rectangleLeft = (window.innerWidth - rectangleWidth) / 2;
    const rectangleRight = rectangleLeft + rectangleWidth;
    const rectangleTop = (window.innerHeight - rectangleHeight) / 2;
    const rectangleBottom = rectangleTop + rectangleHeight;

    // Check if the element is partially within the rectangle
    return (
        rect.top <= rectangleBottom &&
        rect.bottom >= rectangleTop &&
        rect.left <= rectangleRight &&
        rect.right >= rectangleLeft
    );
}

// New helper function to check if a geographic bounding box is in the viewport
function isBBoxInViewport(bbox) {
    // Convert geographic coordinates to screen coordinates
    const [west, south, east, north] = bbox;
    
    // Create points for the corners of the bounding box
    const corners = [
        [west, north], // Northwest
        [east, north], // Northeast
        [east, south], // Southeast
        [west, south]  // Southwest
    ];
    
    // Project each corner to screen coordinates
    const screenCorners = corners.map(coord => {
        const projected = map.projection(coord);
        return {
            x: projected[0],
            y: projected[1]
        };
    });
    
    // Find the bounding box of the projected corners
    const minX = Math.min(...screenCorners.map(p => p.x));
    const maxX = Math.max(...screenCorners.map(p => p.x));
    const minY = Math.min(...screenCorners.map(p => p.y));
    const maxY = Math.max(...screenCorners.map(p => p.y));
    
    // Get the current transform from the zoom behavior
    const zoom = d3.select("#map-svg").call(map.zoom);
    const scale = map.zoom.scale();
    const translate = map.zoom.translate();
    
    // Apply the transform to the bounding box
    const transformedMinX = translate[0] + minX * scale;
    const transformedMaxX = translate[0] + maxX * scale;
    const transformedMinY = translate[1] + minY * scale;
    const transformedMaxY = translate[1] + maxY * scale;
    
    // Define the dimensions of the viewport rectangle
    const rectangleWidth = 400;
    const rectangleHeight = 400;
    
    // Calculate the position of the rectangle
    const rectangleLeft = (window.innerWidth - rectangleWidth) / 2;
    const rectangleRight = rectangleLeft + rectangleWidth;
    const rectangleTop = (window.innerHeight - rectangleHeight) / 2;
    const rectangleBottom = rectangleTop + rectangleHeight;
    
    // Check if the transformed bounding box intersects with the viewport rectangle
    return !(
        transformedMaxX < rectangleLeft ||
        transformedMinX > rectangleRight ||
        transformedMaxY < rectangleTop ||
        transformedMinY > rectangleBottom
    );
}

function displayKeyboardModeMessage() {
    const message = document.getElementById("keyboard-mode-message");
    message.classList.remove("hidden");
    const innerMessage = document.createElement("div");
    innerMessage.innerHTML = "<h2>Keyboard mode active! <span class='fa fa-keyboard'></span> </h2><p>Type a <kbd>number</kbd> to select a country.<p><p>Move around with <kbd>&#8592;</kbd><kbd>&#8594;</kbd><kbd>&#8593;</kbd><kbd>&#8595;</kbd> keys.</p><p>Zoom out with <kbd>-</kbd> key. </p><p>Toggle audio feedback with <kbd>A</kbd> key.</p>";
    message.appendChild(innerMessage);
    
    // Add the visual indicator for the 400x400 box
    addViewportBoxIndicator();
}

function hideKeyboardModeMessage() {
    const message = document.getElementById("keyboard-mode-message");
    message.classList.add("hidden");
    message.innerHTML = "";
    
    // Remove the visual indicator
    removeViewportBoxIndicator();
}

// Add a visual indicator for the 400x400 box used to determine visible countries
function addViewportBoxIndicator() {
    // Remove any existing indicator first
    removeViewportBoxIndicator();
    
    // Create the indicator element
    const indicator = document.createElement("div");
    indicator.id = "viewport-box-indicator";
    
    // Calculate the position and size
    const rectangleWidth = 400;
    const rectangleHeight = 400;
    const rectangleLeft = (window.innerWidth - rectangleWidth) / 2;
    const rectangleTop = (window.innerHeight - rectangleHeight) / 2;
    
    // Set the styles
    indicator.style.position = "fixed";
    indicator.style.left = rectangleLeft + "px";
    indicator.style.top = rectangleTop + "px";
    indicator.style.width = rectangleWidth + "px";
    indicator.style.height = rectangleHeight + "px";
    indicator.style.border = "1px solid rgba(255, 255, 255, 0.6)";
    indicator.style.pointerEvents = "none"; // Make sure it doesn't interfere with clicks
    indicator.style.zIndex = "1000"; // Make sure it's above the map but below other UI
    indicator.style.boxSizing = "border-box";

    
    // Update position on window resize
    window.addEventListener('resize', updateViewportBoxPosition);
}

function removeViewportBoxIndicator() {
    const indicator = document.getElementById("viewport-box-indicator");
    if (indicator) {
        indicator.remove();
    }
    window.removeEventListener('resize', updateViewportBoxPosition);
}

function updateViewportBoxPosition() {
    const indicator = document.getElementById("viewport-box-indicator");
    if (indicator) {
        const rectangleWidth = 400;
        const rectangleHeight = 400;
        const rectangleLeft = (window.innerWidth - rectangleWidth) / 2;
        const rectangleTop = (window.innerHeight - rectangleHeight) / 2;
        
        indicator.style.left = rectangleLeft + "px";
        indicator.style.top = rectangleTop + "px";
    }
}

function getPathCenter(path) {
    const y = parseFloat(path.getAttribute("data-center-y"));
    const x = parseFloat(path.getAttribute("data-center-x"));
    return {
        x: -x,
        y: -y
    };
    
  }

let hasAnnounced = false;

function getVisibleCountries() {
    // Get all country elements in a D3 v3 compatible way
    const countriesSelection = d3.selectAll(".country");
    const countries = [];
    
    // Convert D3 selection to array in v3 compatible way
    countriesSelection.each(function() {
        countries.push(this);
    });
    
    // Filter out countries that should be excluded
    const filteredCountries = countries.filter(country => {
        const countryId = parseInt(country.id.slice(1));
        
        // Skip excluded country IDs
        if (EXCLUDED_COUNTRY_IDS.includes(countryId)) {
            return false;
        }
        
        // Skip countries with undefined names
        const countryName = utils.getCountryNameFromId(countryId);
        if (!countryName || countryName === "undefined") {
            return false;
        }
        
        // Check if the country is in the viewport
        return isInViewport(country);
    });
    
    return filteredCountries;
}

// New function to get a summary of visible countries
function getVisibleCountriesSummary() {
    const countries = getVisibleCountries();
    return `${countries.length} ${countries.length === 1 ? 'country' : 'countries'} visible, press L to list`;
}

function updateVisibleCountries(zoom) {
    keyboardMode.cleanup();
    
    // Get filtered visible countries
    visibleCountries = getVisibleCountries();
    
    if (zoom && zoom.scale() >= MIN_ZOOM_LEVEL_FOR_KEYBOARD_MODE) {
        // Lets start keyboard mode
        KEYBOARD_MODE_ACTIVE = true;
        displayKeyboardModeMessage();
        // TODO: Find a working way to only announce this once
        if (!hasAnnounced) {
            announcer.announce("Keyboard mode active! Press L to hear the list of countries.")
            hasAnnounced = true;
        }
        
        // Hide controls, footer and legend
        document.getElementById("controls").classList.add("hidden");
        document.getElementById("legend").classList.add("hidden");
        document.getElementById("filter-text").classList.add("hidden");
        document.getElementById("filter").classList.add("hidden");
        document.querySelector(".no-countries").classList.add("hidden");
        document.getElementById("friends").classList.add("hidden");
        
        // Assign numbers to countries if they don't already have one
        assignNumbersToCountries();
        
        // display a number on the center of each country
        visibleCountries.forEach((country) => {
            window.addEventListener('keydown', handleNumberKeyPress);
            
            var center = getPathCenter(country);
            const countryId = country.id;
            const number = countryNumberMap[countryId];
            
            // Append a circle
            d3.select(country.parentElement).append("rect")
                .attr("class", "a11y-number-bg")
                .attr("x", center.x - 1.5) // position the rectangle
                .attr("y", center.y - 1.5) // position the rectangle
                .attr("width", 3) // width of the rectangle
                .attr("height", 3) // height of the rectangle
                .attr("rx", 0.5) // horizontal corner radius
                .attr("ry", 0.5); // vertical corner radius
            
            // Append a text for the number
            d3.select(country.parentElement).append("text")
                .attr("class", "a11y-number")
                .attr("data-country-id", countryId)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "middle")
                .attr("x", center.x) // position the text
                .attr("y", center.y + 0.2) // position the text
                .text(number);
            
            // Append a text for the country name
            d3.select(country.parentElement).append("text")
                .attr("class", "a11y-country-name")
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "middle")
                .attr("font-size", "0.1rem")
                .attr("x", center.x) // position the text
                .attr("y", center.y + 4) // position the text below the number
                .text(utils.getCountryNameFromId(parseInt(countryId.slice(1))));
        });
    }
}

// New function to assign numbers to countries
function assignNumbersToCountries() {
    // Try to keep previous assignments
    const usedNumbers = new Set();
    visibleCountries.forEach((country) => {
        const countryId = country.id;
        // If already assigned and not used, keep it
        if (countryNumberMap[countryId] && !usedNumbers.has(countryNumberMap[countryId])) {
            usedNumbers.add(countryNumberMap[countryId]);
            return;
        }
        // Assign the first available number
        for (let i = 0; i < NUMBER_POOL.length; i++) {
            const num = NUMBER_POOL[i];
            if (!Object.values(countryNumberMap).includes(num) && !usedNumbers.has(num)) {
                countryNumberMap[countryId] = num;
                usedNumbers.add(num);
                break;
            }
        }
    });
    // Clean up numbers for countries that are no longer visible
    Object.keys(countryNumberMap).forEach(id => {
        const isVisible = visibleCountries.some(country => country.id === id);
        if (!isVisible) {
            delete countryNumberMap[id];
        }
    });
}

// Update the announcement functions to only include country count when keyboard mode is active
function getAnnouncementText(baseText) {
    if (KEYBOARD_MODE_ACTIVE) {
        const audioFeedbackIsEnabled = window.auditoryFeedback && window.auditoryFeedback.isEnabled();
        return `${baseText}. ${getVisibleCountriesSummary()}. ${audioFeedbackIsEnabled ? "Press A to turn off audio feedback." : ""}`;
    }
    return baseText;
}

(function () {

    keyboardMode.init = function (zoom, move, width, height, MAX_ZOOM) {
        // Store the zoom behavior for use in other methods
        keyboardMode.zoomBehavior = zoom;
        
        // Set keyboard listeners for zoom and pan
        window.addEventListener('keydown', function(e) {
            // If any dialog is open, do not process keyboard mode events
            if (document.querySelector('dialog[open]')) {
                return;
            }

            const param = window.location.href.split("username=")[1];


            // Exit if the search is active or there is no user yet
            if (search.getSearchStatus() || !param ) {
                return;
            }

            // Get the current translation and scale
            var t = zoom.translate();
            var s = zoom.scale();

            // Define the distance for each pan step
            var panStep = 100;

            // Define the factor for each zoom step
            var zoomStep = 1.25;

            // Get the center of the screen
            var center = [width / 2, height / 2];

            

            // Adjust the translation or scale based on the key pressed
            switch(e.key) {

                case 'Escape':
                    if (map.centered !== null) {
                        map.dismissCenteredCountry();
                        keyboardMode.cleanup();
                        // Restore focus to the img
                        d3.select('#map-svg').node().focus();
                        return
                    }
                    // reset the zoom and translation
                    // Calculate the new scale
                    var newScale = 1;

                    // Calculate the new translation to keep the center fixed
                    t[0] = center[0] + (t[0] - center[0]) * newScale / s;
                    t[1] = center[1] + (t[1] - center[1]) * newScale / s;

                    // Update the scale
                    s = newScale;
                    e.preventDefault();
                    move(t, s, false, true);
                    keyboardMode.cleanup();
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Keyboard',
                        eventAction: 'Escape key',
                        eventLabel: 'test'
                    });
                    break;
                    
                case 'ArrowUp':
                    t[1] += panStep;
                    e.preventDefault();
                    move(t, s, false, true);
                    getVisibleCountries();
                    // Update announcement to include country count only when keyboard mode is active
                    setTimeout(() => {
                        const message = getAnnouncementText("Panning north");
                        announcer.announce(message, "assertive", 100);
                    }, 100);
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Keyboard',
                        eventAction: 'ArrowUp key',
                        eventLabel: 'test'
                    });
                    break;
                case 'ArrowDown':
                    t[1] -= panStep;
                    e.preventDefault();
                    move(t, s, false, true);
                    getVisibleCountries();
                    // Update announcement to include country count only when keyboard mode is active
                    setTimeout(() => {
                        const message = getAnnouncementText("Panning south");
                        announcer.announce(message, "assertive", 100);
                    }, 100);
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Keyboard',
                        eventAction: 'ArrowDown key',
                        eventLabel: 'test'
                    });
                    break;
                case 'ArrowLeft':
                    t[0] += panStep;
                    e.preventDefault();
                    move(t, s, false, true);
                    getVisibleCountries();
                    // Update announcement to include country count only when keyboard mode is active
                    setTimeout(() => {
                        const message = getAnnouncementText("Panning west");
                        announcer.announce(message, "assertive", 100);
                    }, 100);
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Keyboard',
                        eventAction: 'ArrowLeft key',
                        eventLabel: 'test'
                    });
                    break;
                case 'ArrowRight':
                    t[0] -= panStep;
                    e.preventDefault();
                    move(t, s, false, true);
                    getVisibleCountries();
                    // Update announcement to include country count only when keyboard mode is active
                    setTimeout(() => {
                        const message = getAnnouncementText("Panning east");
                        announcer.announce(message, "assertive", 100);
                    }, 100);
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Keyboard',
                        eventAction: 'ArrowRight key',
                        eventLabel: 'test'
                    });
                    break;
                case '+':
                case '-':
                    // Calculate the new scale
                    var newScale = e.key === '+' ? s * zoomStep : s / zoomStep;

                    // If the new scale exceeds the maximum scale, clamp
                    if (newScale > MAX_ZOOM) {
                    newScale = MAX_ZOOM;
                    }

                    // Calculate the new translation to keep the center fixed
                    t[0] = center[0] + (t[0] - center[0]) * newScale / s;
                    t[1] = center[1] + (t[1] - center[1]) * newScale / s;

                    // Update the scale
                    s = newScale;
                    e.preventDefault();
                    move(t, s, false, true);

                    // Update visible countries and keyboard mode
                    updateVisibleCountries(zoom);

                    // Update announcement to include country count only when keyboard mode is active
                    setTimeout(() => {
                        const baseMessage = `Zoom ${e.key === '+' ? "in" : "out"} level ${parseInt(newScale)}`;
                        const message = getAnnouncementText(baseMessage);
                        announcer.announce(message, "assertive", 100);
                    }, 100);
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Keyboard',
                        eventAction: 'Zoom in/out',
                        eventLabel: 'test'
                    });
                    break;
                case 'h':
                    // Help for screen reader users. Read out the contents of #a11y-info-text
                    announcer.announce(document.getElementById("a11y-info-text").textContent, "polite");
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Keyboard',
                        eventAction: 'Help',
                        eventLabel: 'test'
                    }); 
                    break;
                case 'l':
                    if (!KEYBOARD_MODE_ACTIVE) {
                        announcer.announce("Keyboard mode is not active right now. Zoom in to at least level 7 to activate.", "assertive", 100);
                        ga('send', {
                            hitType: 'event',
                            eventCategory: 'Keyboard',
                            eventAction: 'List countries (premature)',
                            eventLabel: 'test'
                        });
                        return;
                    }
                    // announce the list of countries. Temporarily removing the prefix to improve screen reader ux
                    // let message = "Listing countries: ";
                    let message = "";
                    const countries = getCurrentlyVisibleCountries();
                    
                    // Sort countries by their assigned number
                    countries.sort((a, b) => a.number.localeCompare(b.number));
                    
                    countries.forEach((country) => {
                        message += `${country.number}: ${country.name} (${country.artistCount} artists), `;
                    });
                    announcer.announce(message, "assertive", 100);
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Keyboard',
                        eventAction: 'List countries',
                        eventLabel: 'test'
                    });
                    break;
                default:
                    return; // Exit if it's not an arrow key or zoom key
            }

            if (map.centered !== null) {
                map.dismissCenteredCountry();
            }

            // Only handle arrow keys for navigation
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
                e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                
                // Then trigger the auditory feedback after a small delay
                // to allow the map to update first
                setTimeout(function() {
                    if (window.auditoryFeedback && window.auditoryFeedback.isEnabled()) {
                        window.auditoryFeedback.updateFeedback();
                    }
                }, 100);
            }

        });

    }

    keyboardMode.cleanup = function () {
        hideKeyboardModeMessage();
        KEYBOARD_MODE_ACTIVE = false;
        // Reset the letter map when exiting keyboard mode completely
        if (keyboardMode.zoomBehavior && keyboardMode.zoomBehavior.scale() < MIN_ZOOM_LEVEL_FOR_KEYBOARD_MODE) {
            countryNumberMap = {};
        }
        d3.selectAll(".a11y-number").remove();
        d3.selectAll(".a11y-number-bg").remove();
        d3.selectAll(".a11y-country-name").remove();
        // restore controls, footer and legend
        document.getElementById("controls").classList.remove("hidden");
        document.getElementById("friends").classList.remove("hidden");
        document.getElementById("legend").classList.remove("hidden");
        document.getElementById("filter-text").classList.remove("hidden");
        document.getElementById("filter").classList.remove("hidden");
        document.querySelector(".no-countries").classList.remove("hidden");
        // remove keyboard listeners
        window.removeEventListener('keydown', handleNumberKeyPress);
        // Remove the visual indicator
        removeViewportBoxIndicator();
    }

    keyboardMode.isActive = function() {
        // Return true if keyboard mode is currently active
        // Instead of using currentZoomLevel which doesn't exist,
        // use the stored zoom behavior and check its scale
        return keyboardMode.zoomBehavior && 
               keyboardMode.zoomBehavior.scale() >= MIN_ZOOM_LEVEL_FOR_KEYBOARD_MODE;
    }

    keyboardMode.getStatus = function () {
        return KEYBOARD_MODE_ACTIVE;
    }

    function enableKeyboardMode() {
        isKeyboardModeEnabled = true;
        // Likely adds visual indicators or focus states
    }

    function disableKeyboardMode() {
        isKeyboardModeEnabled = false;
        currentFocus = null;
        // Removes visual indicators
    }

    keyboardMode.updateVisibleCountries = function(zoom) {
        updateVisibleCountries(zoom);
    };

    // Add this line to expose the getCurrentlyVisibleCountries function
    keyboardMode.getCurrentlyVisibleCountries = function() {
        return getCurrentlyVisibleCountries();
    };

})();
