const noCountries = noCountries || {};

var listOfArtistsWithNoCountry = [];
var updateNoCountriesListInterval = null;

var saveToStorage = function (key, object, cb) {
    localforage.setItem(key, object, cb || function () {});
}

function sortArtists(data, method) {
    if (method === "scrobbles")
        return data.sort((a, b) => b.playcount - a.playcount);
    else if (method === "name")
        return data.sort((a, b) => a.artist.localeCompare(b.artist));
}

// Define updateNoCountriesList outside so it can be called globally
function updateNoCountriesList() {
    let artistsState = JSON.parse(localStorage.getItem('noCountryArtistsProgress')) || {};
    const sortedData = sortArtists(listOfArtistsWithNoCountry, noCountryArtistSortMethod);
    var noCountriesListEl = d3.select(".no-countries__content ul");
    noCountriesListEl.html("");
    sortedData.forEach(function (_art) {
        let artistState = artistsState[_art.artist] || { artistName: _art.artist, checked: false };
        let isInQueue = typeof api !== 'undefined' && api.isArtistInMusicBrainzQueue && api.isArtistInMusicBrainzQueue(_art.artist);
        let listItem = noCountriesListEl.append("li");
        listItem.append("input")
            .attr("type", "checkbox")
            .property("checked", artistState.checked)
            .attr("id", _art.artist)
            .on("change", handleCheckboxChange);
        
        // Build label HTML with optional MusicBrainz indicator
        let labelHtml = '<a href="' + _art.url + '" target="blank" class="no-countries__link">' + _art.artist + '</a>';
        if (isInQueue) {
            labelHtml += '<span class="no-countries__fetching" aria-label="Fetching from MusicBrainz">...</span>';
        }
        labelHtml += '<span class="no-countries__secondary">' + _art.playcount + ' scrobbles</span>';
        
        listItem.append("label")
            .attr("for", _art.artist)
            .html(labelHtml);
        if (document.querySelector("#hide-checked")?.checked && artistState.checked) {
            listItem.style("display", "none");
        }
    })
    d3.select(".no-countries__info").html(listOfArtistsWithNoCountry.length + " artists without a country:");
}

function handleCheckboxChange() {
    let artistName = this.id;
    let checked = this.checked;
    let artistsState = JSON.parse(localStorage.getItem('noCountryArtistsProgress')) || {};
    artistsState[artistName] = { artistName, checked };
    localStorage.setItem('noCountryArtistsProgress', JSON.stringify(artistsState));
    // If you just checked and the filter is on, remove the artist from the DOM
    if (checked && document.querySelector("#hide-checked")?.checked) {
        this.parentNode.style.display = 'none';
        let nextCheckbox = this.parentNode.nextElementSibling.querySelector('input');
        if (nextCheckbox) {
            nextCheckbox.focus();
        }
    }
    // get the label element for the filter checked checkbox
    let filterCheckedLabel = document.querySelector("label[for='hide-checked']");
    // Update the label to include the number of checked artists
    filterCheckedLabel.innerHTML = `Hide checked artists (${document.querySelectorAll("dialog[open] ul li input[type='checkbox']:checked").length})`;
    ga('send', {
        hitType: 'event',
        eventCategory: 'No countries',
        eventAction: 'Check artist as done',
        eventLabel: 'test'
    });
}

var addArtistsWithNoCountry = function (data) {
    listOfArtistsWithNoCountry = listOfArtistsWithNoCountry.concat(data);
    saveToStorage("no_countries", listOfArtistsWithNoCountry);
    
    // Queue artists for MusicBrainz fallback if they haven't been queued yet
    if (typeof api !== 'undefined' && typeof api.queueArtistsForMusicBrainz === 'function') {
        // Filter out artists that are already in the queue or already have a country
        var artistsToQueue = data.filter(function(art) {
            // Check if artist already has a country in STORED_ARTISTS
            if (typeof STORED_ARTISTS !== 'undefined' && STORED_ARTISTS[art.artist] && STORED_ARTISTS[art.artist].country && STORED_ARTISTS[art.artist].country.id) {
                return false; // Already has a country, don't queue
            }
            // Check if already in queue
            if (typeof api !== 'undefined' && api.isArtistInMusicBrainzQueue && api.isArtistInMusicBrainzQueue(art.artist)) {
                return false; // Already in queue
            }
            return true; // Should be queued
        });
        
        if (artistsToQueue.length > 0) {
            console.log("[NoCountries] Queueing", artistsToQueue.length, "artists for MusicBrainz fallback");
            api.queueArtistsForMusicBrainz(artistsToQueue);
        }
    }


    // Check if the checkbox and label already exist
    if (!d3.select("#hide-checked").node() && !d3.select("label[for='hide-checked']").node()) {
        // Add the checkbox next to the filter radios
        d3.select("dialog fieldset").append("input")
            .attr("type", "checkbox")
            .attr("id", "hide-checked")
            .on("change", updateNoCountriesList);
        d3.select("dialog fieldset").append("label")
            .attr("for", "hide-checked")
            .text("Hide checked artists");
    }

    // Handle sorting with radios
    let radios = document.getElementsByName('sort');
    function sortFunction() {
        let selectedValue;
        for (let radio of radios) {
            if (radio.checked) {
                selectedValue = radio.value;
                noCountryArtistSortMethod = selectedValue;
                updateNoCountriesList();
                break;
            }
        }
        ga('send', {
            hitType: 'event',
            eventCategory: 'No countries',
            eventAction: 'Sort artists',
            eventLabel: 'test'
        });
    }

    for (let radio of radios) {
        radio.addEventListener('change', sortFunction);
    }

    updateNoCountriesList("scrobbles");

    // Periodically update the list to show/hide MusicBrainz fetching indicators
    if (updateNoCountriesListInterval) {
        clearInterval(updateNoCountriesListInterval);
    }
    updateNoCountriesListInterval = setInterval(function() {
        // Only update if dialog is open
        var dialog = document.querySelector(".no-countries__content");
        if (dialog && dialog.hasAttribute('open')) {
            updateNoCountriesList();
        }
    }, 1000); // Update every second

    document.querySelector(".no-countries__title").addEventListener("click", function () {
        const dialog = document.querySelector(".no-countries__content");
        dialog.showModal();

        document.querySelector("#no-countries__heading").focus();

        // Update the label to include the number of checked artists
        let filterCheckedLabel = document.querySelector("label[for='hide-checked']");
        filterCheckedLabel.innerHTML = `Hide checked artists (${document.querySelectorAll("dialog[open] ul li input[type='checkbox']:checked").length})`;

        document.addEventListener("keydown", function (e) {
            if (e.keyCode == 27) {
                const dialog = document.querySelector(".no-countries__content");
                dialog.close();
                document.querySelector(".no-countries__title").focus();
            }
        });
        ga('send', {
            hitType: 'event',
            eventCategory: 'No countries',
            eventAction: 'Open dialog',
            eventLabel: 'test'
        });
    });

    document.querySelector(".no-countries__content .close").addEventListener("click", function () {
        const dialog = document.querySelector(".no-countries__content");
        dialog.close();
        document.querySelector(".no-countries__title").focus();
        // Update list when dialog closes to reflect any changes
        updateNoCountriesList();
    });
    const dialog = document.querySelector(".no-countries__content");
    dialog.addEventListener("click", function (event) {
        if (event.target === dialog) {
            dialog.close();
            }
    });

    if (listOfArtistsWithNoCountry.length) {
        setTimeout(function () {
            document.querySelector(".no-countries").classList.remove("hidden");
        }, 850);
    }
}

var removeArtistWithNoCountry = function(artistName) {
    // Remove artist from the list
    var index = listOfArtistsWithNoCountry.findIndex(function(art) {
        return art.artist === artistName;
    });
    
    if (index !== -1) {
        listOfArtistsWithNoCountry.splice(index, 1);
        saveToStorage("no_countries", listOfArtistsWithNoCountry);
        console.log("[NoCountries] Removed artist from no-countries list:", artistName);
        
        // Update the UI if dialog is open
        var dialog = document.querySelector(".no-countries__content");
        if (dialog && dialog.hasAttribute('open')) {
            updateNoCountriesList();
        }
        
        // Hide the no-countries section if list is now empty
        if (listOfArtistsWithNoCountry.length === 0) {
            document.querySelector(".no-countries").classList.add("hidden");
        }
        
        return true;
    }
    return false;
};

noCountries.addArtistsWithNoCountry = addArtistsWithNoCountry;
noCountries.updateList = updateNoCountriesList;
noCountries.removeArtist = removeArtistWithNoCountry;