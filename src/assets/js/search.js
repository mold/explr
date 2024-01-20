/* requires:
api/api.js
utils.js
screenshot.js
*/

const search = search || {};

(function () {
  search.initSearch = function () {

    let FOCUSED_RESULT = null;

    let countriesList = null;

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
        { name: "Clear cached users", onClick: () => { clearExplrCache().then(()=>window.location.reload()) } },
        { name: "Change user", onClick: () => { window.location = "./" } },
        { name: "Change theme", onClick: () => {map.nextTheme()} },
        { name: "Take screenshot", onClick: () => {screenshot.render(true)} },
        { name: "Export data", onClick: () => {utils.exportToCSV(script.getCurrentData())} },
        { name: "Map: Show number of artists", onClick: () => {} },
        { name: "Map: Show number of scrobbles", onClick: () => {} },
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
    console.log(artists.slice(0, 5))

    // Create a div to hold the search field
    let searchContainer = document.createElement('div');
    searchContainer.classList.add("search-container")
    let input = document.createElement('input');
    input.type = 'text';
    input.classList.add("search")
    input.placeholder = 'Search for an artist or a country';
    input.setAttribute('aria-label', 'Search for an artist or a country');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', 'search-results');
    input.role = 'combobox';
    searchContainer.appendChild(input);
    document.body.appendChild(searchContainer);
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

        // Filter the shortcuts based on the user's input
        let filteredShortcuts = shortcuts.filter(shortcut => shortcut.name.toLowerCase().includes(input.value.toLowerCase()));
        if (filteredShortcuts.length > 0 && input.value.length > 3) {
            const shortcutsWrapper = document.createElement('ul');
            let shortcutsHeading = document.createElement('li');
            shortcutsHeading.textContent = 'Explr.fm shortcuts';
            shortcutsHeading.id = 'shortcuts-heading';
            shortcutsHeading.classList.add('search-result-heading');
            shortcutsWrapper.appendChild(shortcutsHeading);
            shortcutsWrapper.setAttribute('role', 'group');
            shortcutsWrapper.ariaLabelledby = 'shortcuts-heading';
            resultsDiv.appendChild(shortcutsWrapper);
        
            filteredShortcuts.slice(0, 5).forEach(c => {
                if (input.value.length > 3) {
                    let searchResultWrapper = document.createElement('div');
                    searchResultWrapper.classList.add('result-wrapper');
                    searchResultWrapper.role = 'option';
                    searchResultWrapper.id = c.name;
                    searchResultWrapper.addEventListener('click', function() {
                        c.onClick();
                    });
                    const shortcutSpan = document.createElement('span');
                    shortcutSpan.classList.add('shortcut-name');
        
                    // Highlight the matching letters
                    let regex = new RegExp(input.value, 'gi');
                    let highlightedName = c.name.replace(regex, match => `<span class="highlight">${match}</span>`);
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
            countriesWrapper.appendChild(countriesHeading);
            countriesWrapper.setAttribute('role', 'group');
            countriesWrapper.ariaLabelledby = 'countries-heading';
            resultsDiv.appendChild(countriesWrapper);

            filteredCountries.slice(0, 5).forEach(c => {
                if (input.value.length > 1) {
                    let searchResultWrapper = document.createElement('div');
                    searchResultWrapper.classList.add('result-wrapper', 'country');                    searchResultWrapper.role = 'option';
                    searchResultWrapper.id = c.name;
                    // Zoom into the country on click
                    searchResultWrapper.addEventListener('click', function() {
                        search.stopSearch();
                        console.log(`You clicked on ${c.name}`)
                        const country = document.querySelector(`.country#c${c.id}`);
                        if (country) country.dispatchEvent(new Event('click'));
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
            let artistsHeading = document.createElement('li');
            artistsHeading.textContent = 'Artists';
            artistsHeading.classList.add('search-result-heading');
            artistsHeading.id = 'artists-heading';
            artistsWrapper.appendChild(artistsHeading);
            artistsWrapper.setAttribute('role', 'group');
            artistsWrapper.ariaLabelledby = 'artists-heading';
            resultsDiv.appendChild(artistsWrapper);
        
            filteredArtists.slice(0, 100).forEach(artist => {
                if (input.value.length > 1) {
                    let searchResultWrapper = document.createElement('div');
                    searchResultWrapper.classList.add('result-wrapper');
                    searchResultWrapper.role = 'option';
                    searchResultWrapper.id = artist.artist;
                    // Zoom into the country of the artist on click
                    searchResultWrapper.addEventListener('click', function() {
                        search.stopSearch();
                        console.log(`You clicked on ${artist.artist} from ${artist.id}`)
                        const country = document.querySelector(`.country#c${artist.id}`);
                        if (country) country.dispatchEvent(new Event('click'));
                        setTimeout(() => {
                            map.showArtists(1, 5, true, artist.artist)
                        }, 250);
                    });
                    let artistWrapper = document.createElement('span');
                    artistWrapper.classList.add('artist-wrapper');
                    let artistCountryWrapper = document.createElement('span');
                    artistCountryWrapper.classList.add('country-wrapper');
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

        // If arrow down, we set aria-activedescentant to the next result
        if (evt.keyCode === 40 && SEARCH_IS_OPEN) {
            evt.preventDefault();
            if (FOCUSED_RESULT) {
                FOCUSED_RESULT.classList.remove('focused');
                inputElement.setAttribute('aria-activedescendant', undefined);
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
                    inputElement.setAttribute('aria-activedescendant', FOCUSED_RESULT.id);
                    FOCUSED_RESULT.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                FOCUSED_RESULT = document.querySelector('.result-wrapper');
                FOCUSED_RESULT.classList.add('focused');
                inputElement.setAttribute('aria-activedescendant', FOCUSED_RESULT.id);
                FOCUSED_RESULT.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        // If arrow up, we set aria-activedescentant to the previous result
        if (evt.keyCode === 38 && SEARCH_IS_OPEN) {
            evt.preventDefault();
            if (FOCUSED_RESULT) {
                FOCUSED_RESULT.classList.remove('focused');
                inputElement.setAttribute('aria-activedescendant', undefined);
                let previousResult = FOCUSED_RESULT.previousElementSibling;
                if (!previousResult) {
                    // If there's no previous sibling, find the previous group and select the last result in it
                    let previousGroup = FOCUSED_RESULT.parentElement.previousElementSibling;
                    if (previousGroup) {
                        let resultsInGroup = previousGroup.querySelectorAll('.result-wrapper');
                        previousResult = resultsInGroup[resultsInGroup.length - 1];
                    }
                }
                FOCUSED_RESULT = previousResult;
                if (FOCUSED_RESULT) {
                    FOCUSED_RESULT.classList.add('focused');
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
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) searchContainer.remove();
    SEARCH_IS_OPEN = false;
  }
})();