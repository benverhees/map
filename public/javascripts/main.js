var hitmap = {
  bounds: null,
  map: null,
  mgr: null,
//  heatmap: null,
  data: null,
  socket: null,
  updateInterval: 1000,
  plot: null,
  timezoneoffset: null,
  panoramioBlock: null,
  imageLink: null,
  image: null,
}

hitmap.init = function() {
  var d = new Date();
  hitmap.timezoneoffset = d.getTimezoneOffset() * 60 * 1000;

  $("#map_canvas").fadeTo(1, 0.2);

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
  $(window).resize(function() {
    hitmap.map.fitBounds(hitmap.bounds);
  });

  this.mgr = new MarkerManager(hitmap.map);
  //this.mgr = new MarkerClusterer(hitmap.map);
  //this.heatmap = new HeatmapOverlay(hitmap.map, {"radius":15, "visible":true, "opacity":60});

  this.data = new Array();

  var messagewindow = document.createElement('DIV');
  messagewindow.id = 'messagewindow';
  google.maps.event.addDomListener(messagewindow, 'click', function() {
    $(messagewindow).animate({
    width: "70%",
  }, 500 );
  });
  var logo = document.createElement('IMG');
  logo.style.height = '70px';
  logo.style.width = '70px';
  logo.style.float = 'left';
  logo.src = 'https://twimg0-a.akamaihd.net/profile_images/74182282/logo_colours_400px_crop.jpg';
  
  messagewindow.appendChild(logo);
//  var message = document.createElement('P');
//  message.innerText = "This is a message";
//  messagewindow.appendChild(message);
  
  hitmap.map.controls[google.maps.ControlPosition.TOP_LEFT].push(messagewindow);
  addChart();

  google.maps.event.addListener(this.mgr, 'loaded', function(){

    hitmap.socket = io.connect();
    hitmap.socket.on('m', function(data){
      if ('buffer' in data){
        for (var i in data.buffer) hitmap.addmarker(data.buffer[i]);
      } else {
        hitmap.addmarker(data);
      }
    });
    hitmap.socket.on('graphdata', function(data){
      if (hitmap.data.length == 0 && 'buffer' in data){
        for (var i in data.buffer) {
          addChartData(data.buffer[i]);
        }
        hitmap.updatechart();
      } else {
        addChartData(data);
        hitmap.updatechart();
      }
    });
    hitmap.socket.on('connect', function(){
      $("#map_canvas").stop().fadeTo(500, 1);
    });
    hitmap.socket.on('disconnect', function(){
      $("#map_canvas").stop().fadeTo(1000, 0.5);
    });
    hitmap.socket.on('reconnecting', function(reconnectionDelay,reconnectionAttempts){
      //console.log('delay: ' + reconnectionDelay + ' attempts: ' + reconnectionAttempts);
      $("#map_canvas").stop().fadeTo(1000, 0.5);
    });
    hitmap.socket.on('reconnect_failed', function(){
      $("#map_canvas").stop().fadeTo(1000, 0.2);
    });
  });
}

function addChartData(data) {
  if(hitmap.data == null) hitmap.data = new Array();
  if(hitmap.data.length >= 300) hitmap.data.shift();

  //Timezone correction
  data[0] -= hitmap.timezoneoffset;
  
  if(hitmap.data.length == 0) {
    hitmap.data.push(data);
    startStream();
  }else{
    hitmap.data.push(data);
  }
}

function addChart() {
    var livechart = document.createElement('div');
    livechart.id = 'livechart'
    livechart.style.width = '100%';
    livechart.style.height = '100px';
    livechart.style.margin = '25px';
    hitmap.map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(livechart);
}

function startStream() {
    var totalPoints = 300;

    // setup plot
    var options = {
        valueLabels: {
          show: true
        },
        grid: { 
          borderWidth: 0,
        },
        series: {
          lines: { show: true, lineWidth: 2, fill: true, fillColor: "rgba(0, 0, 0, 0.1)" },
        },
        yaxis: { min: 0,
          minTickSize: 1,
          tickDecimals: 0
        },
        xaxis: { mode: "time",
          minTickSize: [1, "minute"],
        },
        colors: ["rgba(0, 0, 0, 0.1)"],
    };
    hitmap.plot = $.plot($("#livechart"), hitmap.data, options);
}

hitmap.updatechart = function() {
  if(hitmap.plot != null) {
    hitmap.plot.setData([ hitmap.data ]);
    hitmap.plot.setupGrid();
    hitmap.plot.draw();
  }
}

hitmap.addmarker = function(data) {
  if(data.lat && data.lng) {
  // create a new LatLng point for the marker
    var point = new google.maps.LatLng(data.lat,data.lng);
    //this.bounds.extend(point);
    //hitmap.map.fitBounds(this.bounds);

    var icon = 'http://g.etfv.co/' + data.r;
    var marker = new google.maps.Marker({
      position: point,
      zIndex: data.t,
      icon: icon,
    });
    hitmap.mgr.addMarker(marker, 0);
    if(data.i.src) {
      showPhoto(data.i);
    }
    window.setTimeout(function() {
      hitmap.mgr.removeMarker(marker);
    }, 300000);
    //hitmap.heatmap.addDataPoint(data.lat,data.lng,1);

//    var astorPlace = new google.maps.LatLng(data.lat,data.lng);
//    var webService = new google.maps.StreetViewService();  
    /**Check in a perimeter of 100 meters**/ 
//    var checkaround = 100;
    /** checkNearestStreetView is a valid callback function **/

//    webService.getPanoramaByLocation(astorPlace,checkaround ,checkNearestStreetView);
  }
}

function showPhoto(image) {
  var index = hitmap.map.controls[google.maps.ControlPosition.LEFT_CENTER].getArray().indexOf(hitmap.panoramioBlock);
  console.log("Index: " + index);
  if(index >= 0) {
    hitmap.map.controls[google.maps.ControlPosition.LEFT_CENTER].removeAt(hitmap.map.controls[google.maps.ControlPosition.LEFT_CENTER].getArray().indexOf(hitmap.panoramioBlock));
  }
  hitmap.panoramioBlock = document.createElement('DIV');
  hitmap.panoramioBlock.id = 'panoramio';
  var imageLink = document.createElement('A');
  imageLink.href = image.url;
  var imageElement = document.createElement('IMG');
  imageElement.src = image.src;
  imageElement.width = image.width;
  imageElement.height = image.height;
  imageElement.style.boxShadow = '5px 5px 10px rgba(0,0,0,0.3)';
  imageLink.appendChild(imageElement);
  hitmap.panoramioBlock.appendChild(imageLink);

  hitmap.map.controls[google.maps.ControlPosition.LEFT_CENTER].push(hitmap.panoramioBlock);
}

function checkNearestStreetView(panoData){
    if(panoData){

        if(panoData.location){

          if(panoData.location.latLng){
            /**Well done you can use a nearest existing street viewcoordinates**/
            var imageUrl = 'http://maps.googleapis.com/maps/api/streetview?size=600x300&location=' + panoData.location.latLng.toUrlValue() + '&heading=' + panoData.links[1].heading + 'pitch=-10&sensor=false';
            //console.log(imageUrl);
          }
        }
      }
    /** Else do something... **/
    }

$(document).ready(function(){
  hitmap.init();
});
