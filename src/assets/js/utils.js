const utils = utils || {};

(function () {
  utils.exportToCSV = function (countryCountObj) {
    const list = map.countryNames.map((country) => {
      const countryCount = countryCountObj[country.id];
      return {
        countryId: country.id,
        countryName: country.mainName,
        artists: (countryCount && countryCount[SESSION.name]) || [],
      };
    });

    let csv = json2csv.parse(
      list.sort(({ countryName: a }, { countryName: b }) =>
        a.localeCompare(b, "en")
      ),
      {
        fields: [
          { label: "Country", value: "countryName" },
          { label: "Number of artists", value: (row) => row.artists.length },
          {
            label: "Scrobbles",
            value: (row) =>
              row.artists.reduce((acc, artist) => acc + artist.playcount, 0),
          },
        ],
      }
    );

    csv = "data:text/csv;charset=utf-8," + csv.replaceAll(`"`, "");

    window.open(encodeURI(csv));
  };
})();
