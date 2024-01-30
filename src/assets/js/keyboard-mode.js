/* requires:
aria-announcer.js
*/

const keyboardMode = keyboardMode || {};

const MIN_ZOOM_LEVEL_FOR_KEYBOARD_MODE = 7;
const MAX_COUNTRY_SUGGESTIONS = 20;

let visibleCountries = [];
let keyBuffer = '';
let keyBufferTimer = null;
let keyboardModeActive = false;

const handleNumberCountryKeyPress = (e) => {
    e.preventDefault();
    // Check if user has pressed a number key from 0 to 9
    if (e.key.match(/[0-9]/) && e.target.tagName !== "INPUT") {
        // Add the key to the buffer
        keyBuffer += e.key;

        // Clear the previous timer
        clearTimeout(keyBufferTimer);

        // Set a timer to process the buffer
        keyBufferTimer = setTimeout(() => {
            // Convert the buffer to a number
            var index = Number(keyBuffer) - 1;

            // Check if the index is within the range of visible countries
            if (index >= 0 && index < visibleCountries.length) {
                // Get the country with the corresponding index
                var targetCountry = visibleCountries[index];

                // Generate a click on the target country
                if (targetCountry) {
                    targetCountry.dispatchEvent(new Event('click'));
                }
            }

            // Clear the buffer
            keyBuffer = '';
        }, 500); // adjust the delay as needed
    }
}

function getCurrentlyVisibleCountries() {
    // return an array consiting of objects with the country name in plain text + the index number of the country
    let formattedCountries = [];
    visibleCountries.forEach((country) => {
        var center = getPathCenter(country);
        const number = visibleCountries.indexOf(country) + 1;
        formattedCountries.push({
            name: utils.getCountryNameFromId(parseInt(country.id.slice(1))),
            number: number
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
    innerMessage.innerHTML = "<h2>Keyboard mode active!</h2><p>Type a number to select a country.<p><p>Move around with arrow keys.</p><p>Exit with ESC. </p>";
    message.appendChild(innerMessage);
  }

    function hideKeyboardModeMessage() {
        const message = document.getElementById("keyboard-mode-message");
        message.classList.add("hidden");
        message.innerHTML = "";
    }

function getPathCenter(path) {
    var bbox = path.getBBox();
    return {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2
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
    if (zoom.scale() > MIN_ZOOM_LEVEL_FOR_KEYBOARD_MODE) {
        // Lets start keyboard mode
        displayKeyboardModeMessage();
        // TODO: Find a way to only announce this once
        if (!hasAnnounced) {
            announcer.announce("Keyboard mode active! Type a number to select a country. Move around with arrow keys. Exit with ESC. Press 0 to hear the list of countries.")
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
        window.addEventListener('keydown', handleNumberCountryKeyPress);

        var center = getPathCenter(country);

        const number = visibleCountries.indexOf(country) + 1;


    
        // Append a circle
        d3.select(country.parentElement).append("circle")
            .attr("class", "a11y-number-bg")
            .attr("cx", center.x) // position the circle
            .attr("cy", center.y) // position the circle
            .attr("r", "2") // radius of the circle
            .attr("fill", "black");
    
        // Append a text for the number
        d3.select(country.parentElement).append("text")
            .attr("class", "a11y-number")
            .attr("data-country-id", country.id)
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("fill", "white")
            .attr("x", center.x) // position the text
            .attr("y", center.y + 0.4) // position the text
            .text(number);
    
        // Append a text for the country name
        d3.select(country.parentElement).append("text")
            .attr("class", "a11y-country-name")
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("fill", "black")
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
            // Get the current translation and scale
            var t = zoom.translate();
            var s = zoom.scale();

            // Define the distance for each pan step
            var panStep = 50;

            // Define the factor for each zoom step
            var zoomStep = 1.2;

            // Get the center of the screen
            var center = [width / 2, height / 2];

            // Adjust the translation or scale based on the key pressed
            switch(e.key) {
                case 'Escape':
                    // reset the zoom and translation
                    // Calculate the new scale
                    var newScale = 1;

                    // Calculate the new translation to keep the center fixed
                    t[0] = center[0] + (t[0] - center[0]) * newScale / s;
                    t[1] = center[1] + (t[1] - center[1]) * newScale / s;

                    // Update the scale
                    s = newScale;
                    keyboardMode.cleanup();
                    break;
                    
                case 'ArrowUp':
                    t[1] += panStep;
                    getVisibleCountries(zoom);
                    announcer.announce("Panning north", "assertive", 100)
                    break;
                case 'ArrowDown':
                    t[1] -= panStep;
                    getVisibleCountries(zoom);
                    announcer.announce("Panning south", "assertive", 100)
                    break;
                case 'ArrowLeft':
                    t[0] += panStep;
                    getVisibleCountries(zoom);
                    announcer.announce("Panning west", "assertive", 100)
                    break;
                case 'ArrowRight':
                    t[0] -= panStep;
                    getVisibleCountries(zoom);
                    announcer.announce("Panning east", "assertive", 100)
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
                    getVisibleCountries(zoom);
                    announcer.announce(`Zooming ${e.key === '+' ? 'in' : 'out'}`, "assertive", 100)
                    break;
                case '0':
                    // announce the list of countries
                    let message = "List of countries: ";
                    const countries = getCurrentlyVisibleCountries();
                    countries.forEach((country) => {
                        message += `${country.number}: ${country.name}, `;
                    });
                    announcer.announce(message, "assertive", 100);
                    return;
                default:
                    return; // Exit if it's not an arrow key or zoom key
            }

            // Prevent the default action to stop scrolling
            e.preventDefault();

            // Call the move function with the new translation and scale
            move(t, s, false, true);
        });

    }

    keyboardMode.cleanup = function () {
        hideKeyboardModeMessage();
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
        window.removeEventListener('keydown', handleNumberCountryKeyPress);        
    }

})();
