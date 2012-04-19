/**
 * Value Labels Plugin for flot.
 * http://leonardoeloy.github.com/flot-valuelabels
 * http://wiki.github.com/leonardoeloy/flot-valuelabels/
 *
 * Using canvas.fillText instead of divs, which is better for printing - by Leonardo Eloy, March 2010.
 * Tested with Flot 0.6 and JQuery 1.3.2.
 *
 * Original homepage: http://sites.google.com/site/petrsstuff/projects/flotvallab
 * Released under the MIT license by Petr Blahos, December 2009.
 */
(function ($) {
    var options = {
        valueLabels: {
	    show: false,
        }
    };
    
    function init(plot) {
        plot.hooks.draw.push(function (plot, ctx) {
	    if (!plot.getOptions().valueLabels.show) return;
            
            var ctx = plot.getCanvas().getContext("2d");
	    $.each(plot.getData(), function(ii, series) {
                  // Workaround, since Flot doesn't set this value anymore
                  series.seriesIndex = ii;

		    for (var i = 0; i < series.data.length; ++i) {
			if (series.data[i] == null)  continue;

			var x = series.data[i][0], y = series.data[i][1];
			if (x < series.xaxis.min || x > series.xaxis.max || y < series.yaxis.min || y > series.yaxis.max)  continue;
			var val = y;

			if (series.valueLabelFunc) val = series.valueLabelFunc({ series: series, seriesIndex: ii, index: i });
			val = ""+val;

			//if (i==series.data.length-1) {
			  var xx = series.xaxis.p2c(x)+plot.getPlotOffset().left;
			  var yy = series.yaxis.p2c(y)-12+plot.getPlotOffset().top;
                       yy+=34;
                       if(series.data[i][2]) {
                         for (var url in series.data[i][2]) {
                           var g = new Image();
                           g.src = series.data[i][2][0];

                           x_pos = xx; // - (g.width / 2);
                           y_pos = yy-=34; // - (g.heigth / 2);

                           // If the value is on the top of the canvas, we need
                           // to push it down a little
                           if (yy <= 0) y_pos = 18;
                           // The same happens with the x axis
                           if (xx >= plot.width()) x_pos = plot.width();
                           ctx.drawImage(g, x_pos, y_pos);
                         }
                       }
		       //}
		    }
		});
        });
    }
    
    $.plot.plugins.push({
        init: init,
        options: options,
        name: 'valueLabels',
        version: '1.1'
    });
})(jQuery);