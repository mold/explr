/* requires:
aria-announcer.js
search.js
*/

const keyboardMode = keyboardMode || {};

const MIN_ZOOM_LEVEL_FOR_KEYBOARD_MODE = 7;
const MAX_COUNTRY_SUGGESTIONS = 20;
let KEYBOARD_MODE_ACTIVE = false;
const ALPHABET = 'ABCDEFGIJKMNOPQRSTUVWXYZ'.split('');

let visibleCountries = [];
let keyBuffer = '';
let keyBufferTimer = null;
let keyboardModeActive = false;

const handleLetterKeyPress = (e) => {

    // Check if user has pressed a letter key from A to Z
    if (e.key.match(/[a-zA-Z]/) && e.target.tagName !== "INPUT") {

        // Check if it's a single key press with no modifier keys
        if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) {
            return;
        }
        // Convert the key to uppercase
        const key = e.key.toUpperCase();

        // Convert the key to an index based on the custom alphabet
        const index = ALPHABET.indexOf(key);

        // Check if the index is within the range of visible countries
        if (index >= 0 && index < visibleCountries.length) {
            // Get the country with the corresponding index
            var targetCountry = visibleCountries[index];

            // Generate a click on the target country
            if (targetCountry) {
                targetCountry.dispatchEvent(new Event('click'));
                // Focus the country name
                setTimeout(() => {
                    document.querySelector('#cnameCont h1').setAttribute("tabindex", "-1");
                    document.querySelector('#cnameCont h1').focus();
                }, 250);

                ga('send', {
                    hitType: 'event',
                    eventCategory: 'Keyboard',
                    eventAction: 'Opened country',
                    eventLabel: 'test'
                });
            }
        }
    }
}

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
        const letter = ALPHABET[visibleCountries.indexOf(country)];
        
        // Add null checks for data[countryId] and data[countryId][userName]
        const artistCount = data[countryId] && data[countryId][userName] ? 
            data[countryId][userName].length : 0;
            
        formattedCountries.push({
            name: utils.getCountryNameFromId(parseInt(country.id.slice(1))),
            number: letter,
            artistCount: artistCount
        });
    });
    return formattedCountries;
}

function isInViewport(element) {
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

function displayKeyboardModeMessage() {
    const message = document.getElementById("keyboard-mode-message");
    message.classList.remove("hidden");
    const innerMessage = document.createElement("div");
    innerMessage.innerHTML = "<h2>Keyboard mode active! <span class='fa fa-keyboard'></span> </h2><p>Type a <kbd>letter</kbd> to select a country.<p><p>Move around with <kbd>&#8592;</kbd><kbd>&#8594;</kbd><kbd>&#8593;</kbd><kbd>&#8595;</kbd> keys.</p><p>Exit by zooming out with <kbd>-</kbd> key. </p>";
    message.appendChild(innerMessage);
  }

    function hideKeyboardModeMessage() {
        const message = document.getElementById("keyboard-mode-message");
        message.classList.add("hidden");
        message.innerHTML = "";
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

function getVisibleCountries(zoom) {
    keyboardMode.cleanup();

    var countries = document.querySelectorAll(".country");
    var countriesArray = Array.from(countries);
    // Filter the countries to get only the ones that are visible
    visibleCountries = countriesArray.filter((country) => {
        // Get the bounding box of the current country
        return isInViewport(country);
    });
    if (zoom.scale() >= MIN_ZOOM_LEVEL_FOR_KEYBOARD_MODE) {
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
      
        // display a number on the center of each country
      visibleCountries.forEach((country) => {
        window.addEventListener('keydown', handleLetterKeyPress);

        var center = getPathCenter(country);

        const letter = ALPHABET[visibleCountries.indexOf(country)];

    
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
            .attr("data-country-id", country.id)
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("x", center.x) // position the text
            .attr("y", center.y + 0.2) // position the text
            .text(letter);
    
        // Append a text for the country name
        d3.select(country.parentElement).append("text")
            .attr("class", "a11y-country-name")
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("font-size", "0.1rem")
            .attr("x", center.x) // position the text
            .attr("y", center.y + 4) // position the text below the number
            .text(utils.getCountryNameFromId(parseInt(country.id.slice(1))));
        });
      }
  }

  

(function () {

    keyboardMode.init = function (zoom, move, width, height, MAX_ZOOM) {

        // Set keyboard listeners for zoom and pan
        window.addEventListener('keydown', function(e) {

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
                    getVisibleCountries(zoom);
                    announcer.announce("Panning north", "assertive", 100)
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
                    getVisibleCountries(zoom);
                    announcer.announce("Panning south", "assertive", 100)
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
                    getVisibleCountries(zoom);
                    announcer.announce("Panning west", "assertive", 100)
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
                    getVisibleCountries(zoom);
                    announcer.announce("Panning east", "assertive", 100)
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

                    getVisibleCountries(zoom);
                    announcer.announce(`Zoom ${e.key === '+' ? "in" : "out"} level ${parseInt(newScale)}`, "assertive", 100);
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
                    console.log(document.getElementById("a11y-info-text").textContent);
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
                    // announce the list of countries
                    let message = "List of countries: ";
                    const countries = getCurrentlyVisibleCountries();
                    countries.forEach((country) => {
                        message += `${country.number}: ${country.name} (${country.artistCount} artists), `;
                    });
                    announcer.announce(message, "assertive", 100);
                    console.log(message);
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

        });

    }

    keyboardMode.cleanup = function () {
        hideKeyboardModeMessage();
        KEYBOARD_MODE_ACTIVE = false;
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
        window.removeEventListener('keydown', handleLetterKeyPress);        
    }

    keyboardMode.isActive = KEYBOARD_MODE_ACTIVE;

    keyboardMode.getStatus = function () {
        return KEYBOARD_MODE_ACTIVE;
    }

})();
