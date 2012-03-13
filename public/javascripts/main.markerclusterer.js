var hitmap = {
  bounds: null,
  map: null,
  mgr: null,
  hitcount: null,
  socket: null,
}
hitmap.init = function() {

  $("#map_canvas").fadeTo(1, 0.2);

  var myLatlng = new google.maps.LatLng(32, 5);
  var myOptions = {
    zoom: 3,
    center: myLatlng,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    disableDefaultUI: true,
    styles: 
[
  {
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "water",
    elementType: "geometry",
    stylers: [
      { visibility: "on" },
      { saturation: -100 },
      { lightness: 40 }
    ]
  },{
    featureType: "administrative",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "administrative",
    elementType: "geometry",
    stylers: [
      { visibility: "on" },
      { saturation: -100 },
      { lightness: 75 }
    ]
  },{
    featureType: "landscape",
    stylers: [
      { lightness: 100 }
    ]
  }
]
  }

  this.map = new google.maps.Map($('#map_canvas')[0], myOptions);
  this.bounds = new google.maps.LatLngBounds();
  this.markerclusterer = new MarkerClusterer(hitmap.map);
  this.hitcount = 0;

//  google.maps.event.addListener(this.markerclusterer, 'loaded', function(){

    hitmap.socket = io.connect();
    hitmap.socket.on('marker', function(obj){
      if ('buffer' in obj){
        for (var i in obj.buffer) hitmap.addmarker(obj.buffer[i]);
      } else {
        hitmap.hitcount++;
        window.setTimeout(function() {
          hitmap.hitcount--;
        }, 1000);
        hitmap.addmarker(obj);
      }
    });
//    hitmap.socket.on('hits per second', function(data){
//      if ('buffer' in data){
//        for (var i in data.buffer) hitmap.addmarker(data.buffer[i]);
//      } else {
//        hitmap.hitcount = data.hitcount;
//        update();
//      }
//    });

    hitmap.socket.on('connect', function(){
      $("#map_canvas").stop().fadeTo(500, 1);
    });
    hitmap.socket.on('disconnect', function(){
      $("#map_canvas").stop().fadeTo(1000, 0.5);
    });
    hitmap.socket.on('reconnecting', function(reconnectionDelay,reconnectionAttempts){
      console.log('delay: ' + reconnectionDelay + ' attempts: ' + reconnectionAttempts);
      $("#map_canvas").stop().fadeTo(1000, 0.5);
    });
    hitmap.socket.on('reconnect_failed', function(){
      $("#map_canvas").stop().fadeTo(1000, 0.2);
    });

    var logo = document.createElement('IMG');
    logo.style.margin = '20px';
    logo.style.height = '10%';
    logo.src = 'http://a0.twimg.com/profile_images/74182282/logo_colours_400px_crop.jpg';
    //  logo.src = 'http://a0.twimg.com/profile_images/74182282/logo_colours_400px_crop_normal.jpg';

    hitmap.map.controls[google.maps.ControlPosition.TOP_LEFT].push(logo);
    addChart();

//    var geocoder = new google.maps.Geocoder();
//    geocoder.geocode( { 'address': 'nederland'}, function(results, status) {
//      if (status == google.maps.GeocoderStatus.OK) {
//        console.log(results);
//        hitmap.map.setCenter(results[0].geometry.location);
//        hitmap.map.fitBounds(results[0].geometry.viewport);
//      }
//    });
//  });
}

function addChart() {

    var livechart = document.createElement('div');
    livechart.id = 'livechart'
    livechart.style.width = '100%';
    livechart.style.height = '100px';
    livechart.addEventListener("DOMNodeInsertedIntoDocument", startStream, false);

    hitmap.map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(livechart);
}

function startStream() {
    var data = [], totalPoints = 300;
    function getData() {
        //remove the first value from the start of the array
        if (data.length > 0)
            data.shift();

        timestamp = new Date().getTime() + (2 * 60 * 60 * 1000);

        //add the new value to the end of the array
        data.push([timestamp, hitmap.hitcount]);

        while (data.length < totalPoints) {
          data.unshift([timestamp -= 50, 0]);
        }
        var ret = [{ data: data, label: "Pageviews per second", color: "rgb(0, 0, 0)" }];
        return data;
    }

    // setup control widget
    var updateInterval = 50;

    // setup plot
    var options = {
        grid: { 
          borderWidth: 0,
        },
        series: {
          lines: { lineWidth: 2, fill: true, fillColor: "rgba(0, 0, 0, 0.1)" },
        },
        yaxis: { min: 0 },
        xaxis: { mode: "time" },
        colors: ["rgba(0, 0, 0, 0.1)"]
    };
    var plot = $.plot($("#livechart"), getData(), options);

    function update() {
        plot.setData([ getData() ]);
        plot.setupGrid();
        plot.draw();
	setTimeout(update, updateInterval);
    }
    update();
}

hitmap.addmarker = function(obj) {
  if(obj.lat && obj.lng) {
  // create a new LatLng point for the marker
    var lat = obj.lat;
    var lng = obj.lng;
    var point = new google.maps.LatLng(parseFloat(lat),parseFloat(lng));
    var favicon = 'http://g.etfv.co/' + obj.referrer;
    var marker = new google.maps.Marker({
      position: point,
      //zIndex: new Date().getTime(),
      //map: hitmap.map,
      icon: favicon
    });

    hitmap.markerclusterer.addMarker(marker);
    window.setTimeout(function() {  
      hitmap.markerclusterer.removeMarker(marker);
    }, 10000);

  }
}

$(document).ready(function(){
  hitmap.init();
});
