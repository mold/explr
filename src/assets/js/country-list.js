// Country List Dialog Logic with Accessible Tabs
(function() {
  const button = document.getElementById('country-list-button');
  const dialog = document.getElementById('country-list-dialog');
  const closeBtn = dialog.querySelector('.close');
  const continentsDiv = dialog.querySelector('.country-list__continents');

  const CONTINENTS = ['All','Europe','North America','South America','Asia','Africa','Oceania','Antarctica','Other'];

  // Helper: get scrobbles for a country
  function getCountryScrobbles(country) {
    if (!country || !country.id) return 0;
    if (!window.countryCountObj || !window.countryCountObj[country.id]) return 0;
    let total = 0;
    Object.values(window.countryCountObj[country.id]).forEach(artistArr => {
      artistArr.forEach(a => { total += a.playcount || 0; });
    });
    return total;
  }

  // Helper: get number of artists for a country
  function getCountryArtistCount(country) {
    if (!country || !country.id) return 0;
    if (!window.countryCountObj || !window.countryCountObj[country.id]) return 0;
    return Object.values(window.countryCountObj[country.id]).flat().length;
  }

  // Helper: group countries by continent
  function groupByContinent(countries) {
    const result = {};
    countries.forEach(c => {
      const cont = c.continent || 'Other';
      if (!result[cont]) result[cont] = [];
      result[cont].push(c);
    });
    return result;
  }

  // Helper: sort countries by number of artists
  function sortCountriesByArtists(countries) {
    return countries.slice().sort((a, b) => getCountryArtistCount(b) - getCountryArtistCount(a));
  }

  // Helper: sort countries alphabetically
  function sortCountriesAlpha(countries) {
    return countries.slice().sort((a, b) => a.name.localeCompare(b.name));
  }

  // Helper: sort countries by number of scrobbles (existing)
  function sortCountriesByScrobbles(countries) {
    return countries.slice().sort((a, b) => getCountryScrobbles(b) - getCountryScrobbles(a));
  }

  // Store sort order (persist while dialog is open)
  let currentSort = 'artists'; // 'artists', 'scrobbles', 'alpha'
  let lastFocusedTabIndex = 0;
  let tabRefs = [];
  let panelRefs = [];
  let tablistRef = null;

  // Create sort select element
  function createSortSelect(onChange) {
    const select = document.createElement('select');
    select.className = 'country-sort-select';
    select.setAttribute('aria-label', 'Sort countries');
    [
      { value: 'artists', label: 'Most artists' },
      { value: 'scrobbles', label: 'Most scrobbles' },
      { value: 'alpha', label: 'A–Z' }
    ].forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === currentSort) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener('change', e => {
      currentSort = select.value;
      onChange();
    });
    return select;
  }

  // Main renderTabs logic
  function renderTabs(grouped, selectedIdx = 0, focusTabIndex = null, scrollDirection = 'center') {
    // Only render tablist and panels once
    if (!tablistRef) {
      tablistRef = document.createElement('div');
      tablistRef.setAttribute('role', 'tablist');
      tablistRef.setAttribute('aria-label', 'Continents');
      tablistRef.className = 'country-tabs';
      tabRefs = [];
      CONTINENTS.forEach((cont, i) => {
        if (cont !== 'All' && !grouped[cont]) return;
        const tab = document.createElement('button');
        tab.setAttribute('role', 'tab');
        tab.setAttribute('id', `tab-${cont}`);
        tab.setAttribute('aria-controls', `tabpanel-${cont}`);
        tab.className = 'country-tab';
        tab.textContent = cont === 'All' ? 'All' : cont;
        tab.addEventListener('click', () => activateTab(i));
        tab.addEventListener('keydown', e => handleTabKeydown(e, i));
        tabRefs.push(tab);
        tablistRef.appendChild(tab);
      });
      continentsDiv.appendChild(tablistRef);
      // Panels
      panelRefs = [];
      CONTINENTS.forEach((cont, i) => {
        if (cont !== 'All' && !grouped[cont]) return;
        const panel = document.createElement('div');
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('id', `tabpanel-${cont}`);
        panel.setAttribute('aria-labelledby', `tab-${cont}`);
        panel.className = 'country-tabpanel';
        panelRefs.push(panel);
        continentsDiv.appendChild(panel);
      });
    }
    // Update tabs and panels
    tabRefs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', i === selectedIdx ? 'true' : 'false');
      tab.setAttribute('tabindex', i === selectedIdx ? '0' : '-1');
      if (i === selectedIdx && focusTabIndex !== null) {
        setTimeout(() => {
          tab.focus();
        }, 0);
      }
    });
    panelRefs.forEach((panel, i) => {
      panel.hidden = i !== selectedIdx;
      if (i === selectedIdx) {
        // Render panel content
        panel.innerHTML = '';
        const cont = CONTINENTS[i];
        // Heading row: h2 and sort select
        const headingRow = document.createElement('div');
        headingRow.className = 'country-tabpanel-heading-row';
        const heading = document.createElement('h2');
        heading.className = 'country-tabpanel-heading';
        heading.textContent = cont === 'All' ? 'All countries' : cont;
        headingRow.appendChild(heading);
        // Sort select
        const sortContainer = document.createElement('div');
        sortContainer.className = 'country-sort-container';
        const sortLabel = document.createElement('span');
        sortLabel.className = 'country-sort-label';
        sortLabel.textContent = 'Sort';
        sortContainer.appendChild(sortLabel);
        const sortSelect = createSortSelect(() => {
          renderTabs(grouped, i, i, 'center');
        });
        sortContainer.appendChild(sortSelect);
        headingRow.appendChild(sortContainer);
        panel.appendChild(headingRow);
        // Country list
        const countryList = document.createElement('ul');
        countryList.className = 'country-list';
        let countriesToShow;
        if (cont === 'All') {
          countriesToShow = Object.values(grouped).flat();
        } else {
          countriesToShow = grouped[cont];
        }
        if (currentSort === 'artists') {
          countriesToShow = sortCountriesByArtists(countriesToShow);
        } else if (currentSort === 'scrobbles') {
          countriesToShow = sortCountriesByScrobbles(countriesToShow);
        } else {
          countriesToShow = sortCountriesAlpha(countriesToShow);
        }
        countriesToShow.forEach(country => {
          const li = document.createElement('li');
          li.className = 'country-list__country';
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'country-list__country-btn';
          // Country name
          const nameSpan = document.createElement('span');
          nameSpan.className = 'country-list__country-name';
          nameSpan.textContent = country.name;
          // Secondary text: artist count or scrobbles
          const countSpan = document.createElement('span');
          countSpan.className = 'country-list__country-count';
          if (currentSort === 'scrobbles') {
            const nScrobbles = getCountryScrobbles(country);
            countSpan.textContent = nScrobbles.toLocaleString() + ' scrobbles';
          } else {
            const nArtists = getCountryArtistCount(country);
            countSpan.textContent = nArtists + ' artists';
          }
          btn.appendChild(nameSpan);
          btn.appendChild(countSpan);
          btn.onclick = function() {
            dialog.close();
            setTimeout(() => {
              const el = document.getElementById('c'+country.id);
              if (el) el.dispatchEvent(new Event('click'));
            }, 100);
          };
          li.appendChild(btn);
          countryList.appendChild(li);
        });
        panel.appendChild(countryList);
      } else {
        panel.innerHTML = '';
      }
    });
  }

  // Tab activation logic
  function activateTab(idx) {
    let scrollDirection = 'center';
    if (typeof lastFocusedTabIndex === 'number') {
      if (idx > lastFocusedTabIndex) scrollDirection = 'end';
      else if (idx < lastFocusedTabIndex) scrollDirection = 'start';
    }
    renderTabs(window.map && window.map.countryNames ? groupByContinent(window.map.countryNames) : {}, idx, idx, scrollDirection);
    lastFocusedTabIndex = idx;
  }

  // Keyboard navigation for tabs
  function handleTabKeydown(e, idx) {
    let newIdx = idx;
    if (e.key === 'ArrowRight') {
      do { newIdx = (newIdx + 1) % tabRefs.length; } while (!tabRefs[newIdx]);
      tabRefs[newIdx].focus();
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      do { newIdx = (newIdx - 1 + tabRefs.length) % tabRefs.length; } while (!tabRefs[newIdx]);
      tabRefs[newIdx].focus();
      e.preventDefault();
    } else if (e.key === 'Home') {
      tabRefs[0].focus();
      e.preventDefault();
    } else if (e.key === 'End') {
      tabRefs[tabRefs.length - 1].focus();
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      activateTab(idx);
      e.preventDefault();
    }
  }

  // Open dialog
  button.addEventListener('click', function() {
    if (!window.map || !window.map.countryNames) return;
    const grouped = groupByContinent(window.map.countryNames);
    lastFocusedTabIndex = 0;
    tabRefs = [];
    panelRefs = [];
    tablistRef = null;
    continentsDiv.innerHTML = '';
    renderTabs(grouped, 0, 0, 'center');
    dialog.showModal();
    setTimeout(() => dialog.querySelector('h1').focus(), 100);
  });
  // Close dialog
  closeBtn.addEventListener('click', function() {
    dialog.close();
    button.focus();
    currentSort = 'artists';
  });
  // ESC closes dialog
  dialog.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      dialog.close();
      button.focus();
      currentSort = 'artists';
    }
  });
})(); 