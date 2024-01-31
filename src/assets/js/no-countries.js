const noCountries = noCountries || {};

var listOfArtistsWithNoCountry = [];

var saveToStorage = function (key, object, cb) {
    localforage.setItem(key, object, cb || function () {});
}

function sortArtists(data, method) {
    if (method === "scrobbles")
        return data.sort((a, b) => b.playcount - a.playcount);
    else if (method === "name")
        return data.sort((a, b) => a.artist.localeCompare(b.artist));
}

var addArtistsWithNoCountry = function (data) {
    listOfArtistsWithNoCountry = listOfArtistsWithNoCountry.concat(data);
    saveToStorage("no_countries", listOfArtistsWithNoCountry);

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

    

    function updateNoCountriesList() {
        let artistsState = JSON.parse(localStorage.getItem('noCountryArtistsProgress')) || {};
        const sortedData = sortArtists(listOfArtistsWithNoCountry, noCountryArtistSortMethod);
        var noCountriesListEl = d3.select(".no-countries__content ul");
        noCountriesListEl.html("");
        sortedData.forEach(function (_art) {
            let artistState = artistsState[_art.artist] || { artistName: _art.artist, checked: false };
            let listItem = noCountriesListEl.append("li");
            listItem.append("input")
                .attr("type", "checkbox")
                .property("checked", artistState.checked)
                .attr("id", _art.artist)
                .on("change", handleCheckboxChange);
            listItem.append("label")
                .attr("for", _art.artist)
                .html('<a href="' + _art.url + '" target="blank" class="no-countries__link">' + _art.artist + '</a><span>' + _art.playcount + ' scrobbles</span>');
            if (document.querySelector("#hide-checked")?.checked && artistState.checked) {
                listItem.style("display", "none");
            }
        })
        d3.select(".no-countries__info").html(listOfArtistsWithNoCountry.length + " artists without a country:");
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

noCountries.addArtistsWithNoCountry = addArtistsWithNoCountry;