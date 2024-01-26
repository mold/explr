/* requires:
api/api.js
utils.js
screenshot.js
*/

const search = search || {};

let SEARCH_IS_OPEN = false;

let searchButton = null;

(function () {
    search.initSearch = function () {

    SEARCH_IS_OPEN = true;

    let FOCUSED_RESULT = null;

    let countriesList = null;

    const searchButton = document.querySelector('#search-button');
    if (searchButton) searchButton.ariaExpanded = true;

    api.getCountriesData().then(countries => {
        // countries is the array of country data
        // You can process the countries data here
        countriesList = countries;
      }).catch(error => {
        // Handle any errors here
        console.error(error);
      });

    // List of shortcuts that you can match against
    const shortcuts = [
        { name: "Status", onClick: () => { } },
        { name: "Clear cached users", onClick: () => { clearExplrCache().then(()=>window.location.reload()) } },
        { name: "Change user", onClick: () => { window.location = "./" } },
        { name: "Change theme", onClick: () => {map.nextTheme()} },
        { name: "Download screenshot of map", onClick: () => {screenshot.render(true)} },
        { name: "Export data", onClick: () => {utils.exportToCSV(script.getCurrentData())} },
        { name: "Map: Toggle between artists or scrobbles", onClick: () => { map.toggleFilter() } },
        { name: "Support Explr on BuyMeACoffee", onClick: () => { window.open('https://www.buymeacoffee.com/explrfm', '_blank'); } },
        { name: "Support Explr on Flattr", onClick: () => { window.open('https://flattr.com/@explr.fm', '_blank'); } },
        { name: "View Explr on GitHub", onClick: () => { window.open('https://github.com/mold/explr', '_blank'); } },
    ];
    
    // Get the current data
    let data = script.getCurrentData();

    // Flatten and prepare the data
    let artists = [].concat(...Object.values(data));
    artists = artists.reduce((acc, item) => {
        for (let key in item) {
            if (item.hasOwnProperty(key)) {
                acc = acc.concat(item[key]);
            }
        }
        return acc;
    }, [])

    // Sort the artists by playcount
    artists = artists.sort((a, b) => b.playcount - a.playcount);

    // Create a div to hold the search field
    let searchContainer = document.getElementById('search-container');
    searchContainer.classList.add("search-container")
    const searchInputWrapper = document.createElement('div');
    searchInputWrapper.classList.add("search-input-wrapper")
    let input = document.createElement('input');
    input.type = 'text';
    input.classList.add("search")
    input.placeholder = 'Search for an artist or a country';
    input.setAttribute('aria-label', 'Search for an artist or a country');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', 'search-results');
    input.setAttribute('aria-expanded', 'false');
    input.role = 'combobox';
    searchInputWrapper.appendChild(input);
    searchContainer.appendChild(searchInputWrapper);
    setTimeout(() => {
        input.focus();
    }, 50);

    // Create a div to display the results
    let resultsDiv = document.createElement('div');
    resultsDiv.classList.add("search-results")
    resultsDiv.id = 'search-results';
    resultsDiv.setAttribute('role', 'listbox');
    resultsDiv.setAttribute('aria-label', 'Search results');
    searchContainer.appendChild(resultsDiv);

    // Add an event listener to the input field
    input.addEventListener('input', function() {
        // Clear the previous results
        resultsDiv.innerHTML = '';

        input.setAttribute('aria-expanded', 'true');

        const shortcutsWithoutStatus = shortcuts.filter(shortcut => shortcut.name !== "Status");

        // Filter the shortcuts based on the user's input
            let filteredShortcuts = shortcutsWithoutStatus.filter(shortcut => 
                input.value.toLowerCase() === "shortcuts" || 
                shortcut.name.toLowerCase().includes(input.value.toLowerCase())
            );
            if (filteredShortcuts.length > 0 && input.value.length > 3) {
            const shortcutsWrapper = document.createElement('ul');
            let shortcutsHeading = document.createElement('li');
            shortcutsHeading.textContent = 'Explr.fm shortcuts';
            shortcutsHeading.id = 'shortcuts-heading';
            shortcutsHeading.role = "presentation"
            shortcutsHeading.classList.add('search-result-heading');
            shortcutsWrapper.appendChild(shortcutsHeading);
            shortcutsWrapper.setAttribute('role', 'group');
            shortcutsWrapper.classList.add('search-result-group');
            shortcutsWrapper.ariaLabelledby = 'shortcuts-heading';
            resultsDiv.appendChild(shortcutsWrapper);
        
            filteredShortcuts.forEach(c => {
                if (input.value.length > 3) {
                    if (c.name === "Status") {
                        shortcutsHeading.textContent = 'Explr.fm status';
                    }
                    let searchResultWrapper = document.createElement('div');
                    searchResultWrapper.classList.add('result-wrapper');
                    searchResultWrapper.role = 'option';
                    searchResultWrapper.id = `shortcut-${c.name.replace(/\s+/g, '-').toLowerCase()}`;
                    searchResultWrapper.addEventListener('click', function() {
                        c.onClick();
                    });
                    const shortcutSpan = document.createElement('span');
                    shortcutSpan.classList.add('shortcut-name');
        
                    // Highlight the matching letters
                    let regex = new RegExp(input.value, 'gi');
                    const shortcutName = c.name === "Status" ? script.getLoadingStatus() : c.name
                    let highlightedName = shortcutName.replace(regex, match => `<span class="highlight">${match}</span>`);
                    shortcutSpan.innerHTML = highlightedName;
        
                    searchResultWrapper.appendChild(shortcutSpan);
                    shortcutsWrapper.appendChild(searchResultWrapper);
                }
            });
        }

        // Filter the countries based on the user's input
        let filteredCountries = countriesList.filter(country => 
            country.names.some(name => name.toLowerCase().includes(input.value.toLowerCase()))
        );

        // Display the filtered countries
        if (filteredCountries.length > 0 && input.value.length > 1) {
            const countriesWrapper = document.createElement('ul');
            let countriesHeading = document.createElement('li');
            countriesHeading.textContent = 'Countries';
            countriesHeading.classList.add('search-result-heading');
            countriesHeading.id = 'countries-heading';
            countriesHeading.role = "presentation"
            countriesWrapper.appendChild(countriesHeading);
            countriesWrapper.setAttribute('role', 'group');
            countriesWrapper.classList.add('search-result-group');
            countriesWrapper.setAttribute("aria-labelledby", "countries-heading");
            resultsDiv.appendChild(countriesWrapper);

            filteredCountries.slice(0, 5).forEach(c => {
                if (input.value.length > 1) {
                    let searchResultWrapper = document.createElement('div');
                    searchResultWrapper.classList.add('result-wrapper', 'country');                    searchResultWrapper.role = 'option';
                    searchResultWrapper.id = `country-${c.name.replace(/\s+/g, '-').toLowerCase()}`;                    // Zoom into the country on click
                    searchResultWrapper.addEventListener('click', function() {
                        search.stopSearch();
                        const country = document.querySelector(`.country#c${c.id}`);
                        if (country) {
                            country.dispatchEvent(new Event('click'));
                            setTimeout(() => {
                                document.querySelector('#cnameCont h1').setAttribute("tabindex", "-1");
                                document.querySelector('#cnameCont h1').focus();
                            }, 250);
                        }
                    });
                    const countrySpan = document.createElement('span');

                    countrySpan.classList.add('country-name');
                    const countryArtistsSpan = document.createElement('span');
                    countryArtistsSpan.classList.add('country-artist-count');
                    countryArtistsSpan.textContent = `${utils.getNumberOfArtistsForCountry(c.id)} artists`;

                    // Highlight the matching letters
                    let regex = new RegExp(input.value, 'gi');
                    let highlightedName = c.name.replace(regex, match => `<span class="highlight">${match}</span>`);
                    countrySpan.innerHTML = highlightedName;

                    searchResultWrapper.appendChild(countrySpan);
                    searchResultWrapper.appendChild(countryArtistsSpan);
                    countriesWrapper.appendChild(searchResultWrapper);
                }
            });
        }

        // Filter the artists based on the user's input
        let filteredArtists = artists.filter(country => country.artist.toLowerCase().includes(input.value.toLowerCase()));

        if (filteredArtists.length > 0 && input.value.length > 1) {
            const artistsWrapper = document.createElement('ul');
            artistsWrapper.classList.add('search-result-group');
            let artistsHeading = document.createElement('li');
            artistsHeading.textContent = 'Artists';
            artistsHeading.role = "presentation"
            artistsHeading.classList.add('search-result-heading');
            artistsHeading.id = 'artists-heading';
            artistsWrapper.appendChild(artistsHeading);
            artistsWrapper.setAttribute('role', 'group');
            artistsWrapper.setAttribute("aria-labelledby", "artists-heading");
            resultsDiv.appendChild(artistsWrapper);
        
            filteredArtists.slice(0, 100).forEach(artist => {
                if (input.value.length > 1) {
                    let searchResultWrapper = document.createElement('div');
                    searchResultWrapper.classList.add('result-wrapper');
                    searchResultWrapper.role = 'option';
                    searchResultWrapper.id = `artist-${artist.artist.replace(/\s+/g, '-').toLowerCase()}`;                    // Zoom into the country of the artist on click
                    searchResultWrapper.addEventListener('click', function() {
                        search.stopSearch();
                        console.log(`You clicked on ${artist.artist} from ${artist.id}`)
                        const country = document.querySelector(`.country#c${artist.id}`);
                        if (country) country.dispatchEvent(new Event('click'));
                        setTimeout(() => {
                            map.showArtists(1, 5, true, artist.artist)
                            setTimeout(() => {
                                document.querySelector(`.artist-div[data-artist="${artist.artist}"]`).focus();
                            }, 500);
                        }, 250);
                    });
                    let artistWrapper = document.createElement('span');
                    artistWrapper.classList.add('artist-wrapper');
                    let artistCountryWrapper = document.createElement('span');
                    artistCountryWrapper.classList.add('country-wrapper');
                    const srOnlyFrom = document.createElement('span');
                    srOnlyFrom.classList.add('visually-hidden');
                    srOnlyFrom.textContent = ', from ';
                    let artistPlaycount = document.createElement('span');
                    artistPlaycount.classList.add('playcount');
                    artistPlaycount.textContent = `${artist.playcount} scrobbles`
                    const artistNameSpan = document.createElement('span');
                    artistNameSpan.classList.add('artist-name');
        
                    // Highlight the matching letters
                    let regex = new RegExp(input.value, 'gi');
                    let highlightedName = artist.artist.replace(regex, match => `<span class="highlight">${match}</span>`);
                    artistNameSpan.innerHTML = highlightedName;
        
                    artistWrapper.appendChild(artistNameSpan);
                    artistWrapper.appendChild(artistPlaycount);
                    artistCountryWrapper.textContent = utils.getCountryNameFromId(artist.id) ? utils.getCountryNameFromId(artist.id) : 'Unknown country';
                    artistCountryWrapper.prepend(srOnlyFrom);
                    searchResultWrapper.appendChild(artistWrapper);
                    searchResultWrapper.appendChild(artistCountryWrapper);
                    artistsWrapper.appendChild(searchResultWrapper);
                    artistsWrapper.classList.add('artists-wrapper');
                }
            });
        }

        // Filter the artists for the currently shown country
        let filteredCountryArtists = artists.filter((artist) => filteredCountries.length === 1 && filteredCountries[0].id === artist.id);

        if (filteredCountryArtists.length > 0 && input.value.length > 1) {
            const artistsWrapper = document.createElement('ul');
            artistsWrapper.classList.add('search-result-group');
            let artistsHeading = document.createElement('li');
            artistsHeading.textContent = 'Artists from ' + filteredCountries[0].name;
            artistsHeading.role = "presentation"
            artistsHeading.classList.add('search-result-heading');
            artistsHeading.id = 'artists-country-heading';
            artistsWrapper.appendChild(artistsHeading);
            artistsWrapper.setAttribute('role', 'group');
            artistsWrapper.setAttribute("aria-labelledby", "artists-country-heading");
            resultsDiv.appendChild(artistsWrapper);
        
            filteredCountryArtists.slice(0, 100).forEach(artist => {
                if (input.value.length > 1) {
                    let searchResultWrapper = document.createElement('div');
                    searchResultWrapper.classList.add('result-wrapper');
                    searchResultWrapper.role = 'option';
                    searchResultWrapper.id = `${filteredCountries[0].name}-artist-${artist.artist.replace(/\s+/g, '-').toLowerCase()}`;                    
                    searchResultWrapper.addEventListener('click', function() {
                        search.stopSearch();
                        console.log(`You clicked on ${artist.artist} from ${artist.id}`)
                        const country = document.querySelector(`.country#c${artist.id}`);
                        if (country) country.dispatchEvent(new Event('click'));
                        setTimeout(() => {
                            map.showArtists(1, 5, true, artist.artist)
                            setTimeout(() => {
                                document.querySelector(`.artist-div[data-artist="${artist.artist}"]`).focus();
                            }, 500);
                        }, 250);
                    });
                    let artistWrapper = document.createElement('span');
                    artistWrapper.classList.add('artist-wrapper');
                    let artistCountryWrapper = document.createElement('span');
                    artistCountryWrapper.classList.add('country-wrapper');
                    const srOnlyFrom = document.createElement('span');
                    srOnlyFrom.classList.add('visually-hidden');
                    srOnlyFrom.textContent = ', from ';
                    let artistPlaycount = document.createElement('span');
                    artistPlaycount.classList.add('playcount');
                    artistPlaycount.textContent = `${artist.playcount} scrobbles`
                    const artistNameSpan = document.createElement('span');
                    artistNameSpan.classList.add('artist-name');
        
                    // Highlight the matching letters
                    let regex = new RegExp(input.value, 'gi');
                    let highlightedName = artist.artist.replace(regex, match => `<span class="highlight">${match}</span>`);
                    artistNameSpan.innerHTML = highlightedName;
        
                    artistWrapper.appendChild(artistNameSpan);
                    artistWrapper.appendChild(artistPlaycount);
                    artistCountryWrapper.textContent = utils.getCountryNameFromId(artist.id);
                    artistCountryWrapper.prepend(srOnlyFrom);
                    searchResultWrapper.appendChild(artistWrapper);
                    searchResultWrapper.appendChild(artistCountryWrapper);
                    artistsWrapper.appendChild(searchResultWrapper);
                    artistsWrapper.classList.add('artists-wrapper');
                }
            });
        }

        // Show artists without country when the user types "unknown"
        let noCountryArtists = artists.filter((artist) => 
            input.value.toLowerCase() === "unknown" && 
            !artist.id
        );

        if (noCountryArtists.length > 0 && input.value.length > 1) {
            const artistsWrapper = document.createElement('ul');
            artistsWrapper.classList.add('search-result-group');
            let artistsHeading = document.createElement('li');
            artistsHeading.textContent = 'Artists without a country (first 100)';
            artistsHeading.role = "presentation"
            artistsHeading.classList.add('search-result-heading');
            artistsHeading.id = 'unknown-artists-heading';
            artistsWrapper.appendChild(artistsHeading);
            artistsWrapper.setAttribute('role', 'group');
            artistsWrapper.setAttribute("aria-labelledby", "unknown-artists-heading");
            resultsDiv.appendChild(artistsWrapper);
        
            noCountryArtists.slice(0, 100).forEach(artist => {
                if (input.value.length > 1) {
                    let searchResultWrapper = document.createElement('div');
                    searchResultWrapper.classList.add('result-wrapper');
                    searchResultWrapper.role = 'option';
                    searchResultWrapper.id = `unknown-artist-${artist.artist.replace(/\s+/g, '-').toLowerCase()}`;                    // Zoom into the country of the artist on click
                    searchResultWrapper.addEventListener('click', function() {
                        search.stopSearch();
                        console.log(`You clicked on ${artist.artist} from unknown country`)
                    });
                    let artistWrapper = document.createElement('span');
                    artistWrapper.classList.add('artist-wrapper');
                    let artistCountryWrapper = document.createElement('span');
                    artistCountryWrapper.classList.add('country-wrapper');
                    const srOnlyFrom = document.createElement('span');
                    srOnlyFrom.classList.add('visually-hidden');
                    srOnlyFrom.textContent = ', from ';
                    let artistPlaycount = document.createElement('span');
                    artistPlaycount.classList.add('playcount');
                    artistPlaycount.textContent = `${artist.playcount} scrobbles`
                    const artistNameSpan = document.createElement('span');
                    artistNameSpan.classList.add('artist-name');
        
                    // Highlight the matching letters
                    let regex = new RegExp(input.value, 'gi');
                    let highlightedName = artist.artist.replace(regex, match => `<span class="highlight">${match}</span>`);
                    artistNameSpan.innerHTML = highlightedName;
        
                    artistWrapper.appendChild(artistNameSpan);
                    artistWrapper.appendChild(artistPlaycount);
                    artistCountryWrapper.textContent = "Unknown country";
                    artistCountryWrapper.prepend(srOnlyFrom);
                    searchResultWrapper.appendChild(artistWrapper);
                    searchResultWrapper.appendChild(artistCountryWrapper);
                    artistsWrapper.appendChild(searchResultWrapper);
                    artistsWrapper.classList.add('artists-wrapper');
                }
            });
        }
    });

    // Close the search when the user presses escape
    window.addEventListener("keydown", function (evt) {
        const inputElement = document.querySelector('.search');

        // if backspace or letter key, we clear the focused result
        if (FOCUSED_RESULT && (evt.keyCode === 8 || (evt.keyCode >= 65 && evt.keyCode <= 90))) {
            FOCUSED_RESULT.removeAttribute("aria-selected")
            FOCUSED_RESULT.classList.remove('focused');
            inputElement.removeAttribute('aria-activedescendant');
            FOCUSED_RESULT = null;
            // scroll result list to top
            resultsDiv.scrollTop = 0;
        }

        // If arrow down, we set aria-activedescentant to the next result
        if (evt.keyCode === 40 && SEARCH_IS_OPEN) {
            evt.preventDefault();
            if (FOCUSED_RESULT) {
                FOCUSED_RESULT.removeAttribute("aria-selected")
                FOCUSED_RESULT.classList.remove('focused');
                inputElement.removeAttribute('aria-activedescendant');
                let nextResult = FOCUSED_RESULT.nextElementSibling;
                if (!nextResult) {
                    // If there's no next sibling, find the next group and select the first result in it
                    let nextGroup = FOCUSED_RESULT.parentElement.nextElementSibling;
                    if (nextGroup) {
                        nextResult = nextGroup.querySelector('.result-wrapper');
                    }
                }
                FOCUSED_RESULT = nextResult;
                if (FOCUSED_RESULT) {
                    FOCUSED_RESULT.classList.add('focused');
                    FOCUSED_RESULT.setAttribute("aria-selected", "true")
                    inputElement.setAttribute('aria-activedescendant', FOCUSED_RESULT.id);
                    FOCUSED_RESULT.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                FOCUSED_RESULT = document.querySelector('.result-wrapper');
                FOCUSED_RESULT.classList.add('focused');
                FOCUSED_RESULT.setAttribute("aria-selected", "true")
                inputElement.setAttribute('aria-activedescendant', FOCUSED_RESULT.id);
                FOCUSED_RESULT.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        // If arrow up, we set aria-activedescentant to the previous result
        if (evt.keyCode === 38 && SEARCH_IS_OPEN) {
            evt.preventDefault();
            if (FOCUSED_RESULT) {
                FOCUSED_RESULT.classList.remove('focused');
                FOCUSED_RESULT.removeAttribute("aria-selected")
                inputElement.removeAttribute('aria-activedescendant');
                let previousResult = FOCUSED_RESULT.previousElementSibling;
                if (!previousResult) {
                    // If there's no previous sibling, find the previous group and select the last result in it
                    let previousGroup = FOCUSED_RESULT.parentElement.previousElementSibling;
                    if (previousGroup) {
                        let resultsInGroup = previousGroup.querySelectorAll('.result-wrapper');
                        previousResult = resultsInGroup[resultsInGroup.length - 1];
                    } else {
                        // If there's no previous group, find the last group and select the last result in it
                        let allGroups = document.querySelectorAll('.search-result-group');
                        let lastGroup = allGroups[allGroups.length - 1];
                        if (lastGroup) {
                            let resultsInGroup = lastGroup.querySelectorAll('.result-wrapper');
                            previousResult = resultsInGroup[resultsInGroup.length - 1];
                        }
                        
                    }
                }
                FOCUSED_RESULT = previousResult;
                if (FOCUSED_RESULT) {
                    FOCUSED_RESULT.classList.add('focused');
                    FOCUSED_RESULT.setAttribute("aria-selected", "true")
                    inputElement.setAttribute('aria-activedescendant', FOCUSED_RESULT.id);
                    FOCUSED_RESULT.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }

        // If enter, activate the focused result
        if (evt.keyCode === 13 && SEARCH_IS_OPEN) {
            evt.preventDefault();
            const currentActiveDescendant = inputElement.getAttribute('aria-activedescendant');
            // If the user has selected a result
            if (currentActiveDescendant) {
                const currentActiveElement = document.getElementById(currentActiveDescendant);
                if (currentActiveElement) {
                    currentActiveElement.dispatchEvent(new Event('click'));
                }
            }
        }
        
        // If escape, close the search
        if (evt.keyCode === 27 && SEARCH_IS_OPEN) {
            search.stopSearch();
        }


    });

    // Set up click outside listener for search
    window.addEventListener("click", function (evt) {
        if (SEARCH_IS_OPEN && !evt.target.closest('.search-container')) {
            search.stopSearch();
        }
    });

  }

  search.stopSearch = function () {
    const searchButtonClose = document.querySelector('#search-button');
    const inputElement = document.querySelector('.search');
    if (inputElement !== undefined) {
        inputElement.removeAttribute('aria-activedescendant');
        inputElement.setAttribute('aria-expanded', 'false');
    }
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) searchContainer.innerHTML = '';
    if (searchButtonClose){
        searchButtonClose.focus( {preventScroll: true} ); 
        searchButtonClose.ariaExpanded = false;
    };
    SEARCH_IS_OPEN = false;
  }
  search.getSearchStatus = function () {
    return SEARCH_IS_OPEN;
  }

  search.setSearchStatus = function (status) {
    SEARCH_IS_OPEN = status;
  }

  window.initSearch = search.initSearch;

})();