var hitmap = {
  bounds: null,
  map: null,
  socket: null,
}

hitmap.init = function() {

  var myOptions = {
    zoom: 3,
    center: new google.maps.LatLng(32, 5),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
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

  hitmap.map.setOptions( {disableDefaultUI: true} );

  hitmap.bounds = new google.maps.LatLngBounds(new google.maps.LatLng(50.750, 3.133), new google.maps.LatLng(53.683, 7.217));
  hitmap.map.fitBounds(hitmap.bounds);
  google.maps.event.addListener(hitmap.map, 'bounds_changed', function () {
    hitmap.socket.emit('bounds_changed', hitmap.map.getBounds().toUrlValue());
  });

  $(window).resize(function() {
    hitmap.map.fitBounds(hitmap.bounds);
  });

    hitmap.socket = io.connect();
    
    hitmap.socket.on('connect', function(){
      $("#map_canvas").stop().fadeTo(500, 1);
    });
    hitmap.socket.on('disconnect', function(){
      $("#map_canvas").stop().fadeTo(1000, 0.5);
    });
    hitmap.socket.on('reconnecting', function(reconnectionDelay,reconnectionAttempts){
      $("#map_canvas").stop().fadeTo(1000, 0.5);
    });
    hitmap.socket.on('reconnect_failed', function(){
      $("#map_canvas").stop().fadeTo(1000, 0.2);
    });
}

$(document).ready(function(){
  hitmap.init();
});
