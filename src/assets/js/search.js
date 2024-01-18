/* requires:
api/api.js
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



    
    // Get the data from local storage
    let data = JSON.parse(window.localStorage.getItem('countryCountObj'));

    // Flatten and prepare the data
    let artists = [].concat(...Object.values(data));
    artists = artists.reduce((acc, item) => {
        return acc.concat(item.elfummel);
    }, [])

    // Sort the artists by playcount
    artists = artists.sort((a, b) => b.playcount - a.playcount);

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
    searchContainer.appendChild(resultsDiv);

    // Add an event listener to the input field
    input.addEventListener('input', function() {
        // Clear the previous results
        resultsDiv.innerHTML = '';

        // Filter the countries based on the user's input
        let filteredCountries = countriesList.filter(country => 
            country.names.some(name => name.toLowerCase().includes(input.value.toLowerCase()))
          );

          const countriesWrapper = document.createElement('div');
          if (filteredCountries.length > 0 && input.value.length > 2) {
            let countriesHeading = document.createElement('h2');
            countriesHeading.textContent = 'Countries';
            countriesHeading.classList.add('search-result-heading');
            countriesWrapper.appendChild(countriesHeading);
            resultsDiv.appendChild(countriesWrapper);
          }


          filteredCountries.slice(0, 5).forEach(c => {
            if (input.value.length > 2) {
                let searchResultWrapper = document.createElement('div');
                searchResultWrapper.classList.add('result-wrapper');
                searchResultWrapper.role = 'option';
                searchResultWrapper.ariaSelected = 'false';
                searchResultWrapper.id = c.name;
                const countrySpan = document.createElement('span');
                countrySpan.classList.add('country-name');
                countrySpan.textContent = c.name;
                searchResultWrapper.appendChild(countrySpan);
                countriesWrapper.appendChild(searchResultWrapper);

            }
        });
        const artistsWrapper = document.createElement('div');
        // Filter the artists based on the user's input
        let filteredArtists = artists.filter(country => country.artist.toLowerCase().includes(input.value.toLowerCase()));

        if (filteredArtists.length > 0 && input.value.length > 2) {

            let countriesHeading = document.createElement('h2');
            countriesHeading.textContent = 'Artists';
            countriesHeading.classList.add('search-result-heading');
            artistsWrapper.appendChild(countriesHeading);
            resultsDiv.appendChild(artistsWrapper);
          }
        
        // Display the filtered results
        filteredArtists.slice(0, 100).forEach(artist => {
            if (input.value.length > 2) {
                let searchResultWrapper = document.createElement('div');
                searchResultWrapper.classList.add('result-wrapper');
                searchResultWrapper.role = 'option';
                searchResultWrapper.ariaSelected = 'false';
                searchResultWrapper.id = artist.artist;
                let artistWrapper = document.createElement('span');
                artistWrapper.classList.add('artist-wrapper');
                let artistCountryWrapper = document.createElement('span');
                artistCountryWrapper.classList.add('country-wrapper');
                let artistPlaycount = document.createElement('span');
                artistPlaycount.classList.add('playcount');
                artistPlaycount.textContent = `${artist.playcount} scrobbles`
                const artistNameSpan = document.createElement('span');
                artistNameSpan.classList.add('artist-name');
                artistNameSpan.textContent = artist.artist;
                artistWrapper.appendChild(artistNameSpan);

        
                artistWrapper.appendChild(artistPlaycount);
                
                artistCountryWrapper.textContent = artist.country;
                searchResultWrapper.appendChild(artistWrapper);
                searchResultWrapper.appendChild(artistCountryWrapper);
                artistsWrapper.appendChild(searchResultWrapper);
                artistsWrapper.classList.add('artists-wrapper');

            }
        });

        console.log(filteredCountries)

    });

    // Close the search when the user presses escape
    window.addEventListener("keydown", function (evt) {
        const inputElement = document.querySelector('.search');

        // If arrow down, we set aria-activedescentant to the next result
        if (evt.keyCode === 40 && SEARCH_IS_OPEN) {
            console.log('arrow down');
            evt.preventDefault();
            if (FOCUSED_RESULT) {
                FOCUSED_RESULT.ariaSelected = 'false';
                FOCUSED_RESULT.classList.remove('focused');
                FOCUSED_RESULT = FOCUSED_RESULT.nextElementSibling;
                if (FOCUSED_RESULT) {
                    FOCUSED_RESULT.classList.add('focused');
                    inputElement.setAttribute('aria-activedescendant', FOCUSED_RESULT.id);
                    FOCUSED_RESULT.ariaSelected = 'true';
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
            console.log('arrow up');
            evt.preventDefault();
            if (FOCUSED_RESULT) {
                FOCUSED_RESULT.classList.remove('focused');
                FOCUSED_RESULT = FOCUSED_RESULT.previousElementSibling;
                if (FOCUSED_RESULT) {
                    FOCUSED_RESULT.classList.add('focused');
                    inputElement.setAttribute('aria-activedescendant', FOCUSED_RESULT.id);
                    FOCUSED_RESULT.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }
        

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