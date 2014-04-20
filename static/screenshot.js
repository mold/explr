var screenshot = {};

(function(window, document) {
	screenshot.render = function() {
		var titleString,
			subtitleString = "Make your own at explr.fm",
			img;

		var explrLogo = new Image();

		var svg = d3.select("svg");
		var w = svg.attr("width");
		var h = svg.attr("height");

		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext("2d");

		var backgroundColor = window.getComputedStyle(document.body).backgroundColor;
		var textColor = window.getComputedStyle(document.body).color;

		var drawCenteredText = function(obj) {
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

		// Add color to legend text
		d3.selectAll(".legend text, text.legend").style({
			fill: textColor
		})
		d3.selectAll(".legend rect").style({
			stroke: backgroundColor
		})


		canvg(canvas, new XMLSerializer().serializeToString(svg[0][0]));

		explrLogo.onload = function() {
			/* Add text and shiiet */
			// Add text background box
			ctx.save(); // To draw with different opaticy
			ctx.globalAlpha = 0.5;
			ctx.fillStyle = backgroundColor;
			titleString = SESSION.name + "'s musical world map";
			ctx.font = "34px Patua One";
			ctx.fillRect(w / 2 - ctx.measureText(titleString).width / 2 - 20, h - 80, ctx.measureText(titleString).width + 40, 100);

			// Add explr.fm logo
			console.log(explrLogo);
			ctx.drawImage(explrLogo, w - 130, h - 45, 100, 36);

			// Add text
			ctx.fillStyle = textColor;
			drawCenteredText({
				string: titleString,
				font: "34px Patua One",
				y: h - 40,
			});
			drawCenteredText({
				string: subtitleString,
				font: "20px Didact Gothic",
				y: h - 20,
			})
			ctx.restore(); // To draw with full opacity

			d3.select("#background-rect").remove();

			console.log(canvas.toDataURL())
			// img = document.createElement("img").src = canvas.toDataURL();
			document.getElementById("screenshot-img").src = canvas.toDataURL();
			// d3.select("body").append(img);
			// 
			window.open(canvas.toDataURL(), "_blank");
		}
		explrLogo.src = "static/img/explrlogo.png";
	}

	window.addEventListener("keypress", function(e) {
		if (e.keyCode === 112) {
			screenshot.render();
		}
	});
})(window, document);