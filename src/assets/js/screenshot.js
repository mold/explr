var screenshot = {};

(function (window, document) {
	screenshot.render = function (autoDownload = false) {
		var titleString,
			subtitleString = "Make your own at explr.fm",
			img;

		var explrLogo = new Image();

		var svg = d3.select("#map-svg");
		var w = svg.attr("width");
		var h = svg.attr("height");

		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext("2d");

		// canvg(canvas, document.getElementById("map-svg").outerHTML);

		var backgroundColor = window.getComputedStyle(document.body).backgroundColor;
		var textColor = window.getComputedStyle(document.body).color;

		var drawCenteredText = function (obj) {
			ctx.font = obj.font;
			ctx.fillText(obj.string, w / 2 - ctx.measureText(obj.string).width / 2, obj.y);

			if (obj.lineWidth) {
				ctx.lineWidth = obj.lineWidth;
				ctx.strokeStyle = obj.strokeStyle;
				ctx.strokeText(obj.string, w / 2 - ctx.measureText(obj.string).width / 2, obj.y);
			}
		}

		canvas.width = w;
		canvas.height = h;

		// insert background rect
		svg.insert("rect", "g")
			.attr({
				id: "background-rect",
				width: "100%",
				height: "100%",

			})
			.style({
				fill: backgroundColor,
			});

		// Add color, font to legend text
		d3.selectAll('.legend text, text.legend').style({
			"font-family": function () {
				return window.getComputedStyle(this)["fontFamily"];
			},
			"font-size": function () {
				return window.getComputedStyle(this)["fontSize"];
			},
			"fill": textColor,
		});
		d3.selectAll(".legend rect").style({
			stroke: backgroundColor,
		})

		canvg(canvas, new XMLSerializer().serializeToString(svg[0][0]));

		explrLogo.onload = function () {
			/* Add text and shiiet */
			// Add text background box
			ctx.save(); // To draw with different opaticy
			ctx.globalAlpha = 0.6;
			ctx.fillStyle = backgroundColor;
			let scoreString = SESSION.total_artists + " artists from " + countryScore + " / 209 countries";
			let titleString = SESSION.name + "'s musical world map";
			ctx.font = "34px Patua One";
			ctx.fillRect(w / 2 - ctx.measureText(titleString).width / 2 - 20, h - 110, ctx.measureText(titleString).width + 40, 100);
			ctx.fillStyle = textColor;

			// Add text
			ctx.fillStyle = textColor;
			drawCenteredText({
				string: titleString,
				font: "34px Patua One",
				y: h - 60,
			});
			drawCenteredText({
				string: scoreString,
				font: "20px Didact Gothic",
				y: h - 40,
			});

			// Add explr.fm logo
			ctx.restore();
			ctx.drawImage(explrLogo, w - 130, h - 60, 100, 36);

			d3.select("#background-rect").remove();

			//console.log(canvas.toDataURL())
			// img = document.createElement("img").src = canvas.toDataURL();
			document.getElementById("screenshot-img").src = canvas.toDataURL("image/png");
			// d3.select("body").append(img);
			//

			var dataurl = canvas.toDataURL("image/png");
			// console.log("dataurl:", dataurl)

			// window.open(dataurl, "_blank");

			const overlay = document.getElementsByClassName("screenshot-overlay")[0];
			overlay.style = "";
			overlay.ariaModal = true


			if (autoDownload) {
				setTimeout(function () {
					screenshot.download();
					screenshot.close();
				}, 0);
			}

		}
		explrLogo.src = "assets/img/explrlogo.png";
	}

	screenshot.close = function () {
		document.getElementsByClassName("screenshot-overlay")[0].style = "display:none;";
		document.getElementsByClassName("screenshot-overlay")[0].ariaModal = false;
	}

	screenshot.download = function () {
		var dataurl = document.getElementById("screenshot-img").src;
	
		// Create a new anchor element
		var a = document.createElement('a');
	
		// Set the href and download attributes of the anchor
		a.href = dataurl;
		a.download = 'screenshot.png'; // or any other filename you want
	
		// Append the anchor to the body (this is necessary for Firefox)
		document.body.appendChild(a);
	
		// Programmatically click the anchor
		a.click();
	
		// Remove the anchor from the body
		document.body.removeChild(a);
	}

})(window, document);
