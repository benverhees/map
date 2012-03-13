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

  var myLatlng = new google.maps.LatLng(32, 5);
  var myOptions = {
    zoom: 3,
    center: myLatlng,
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

  this.bounds = new google.maps.LatLngBounds();
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

  hitmap.panoramioBlock = document.createElement('DIV');
  hitmap.panoramioBlock.id = 'panoramio';
  hitmap.imageLink = document.createElement('A');
  hitmap.imageLink.target = '_blank';
  hitmap.panoramioBlock.appendChild(hitmap.imageLink);
  hitmap.image = document.createElement('IMG');
  hitmap.imageLink.appendChild(hitmap.image);
  hitmap.map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(hitmap.panoramioBlock);

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
    //google.maps.event.addListenerOnce(hitmap.map, 'idle', startStream);
    hitmap.map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(livechart);
}

function startStream() {
    var totalPoints = 300;

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
    var icon = 'http://g.etfv.co/' + data.r;
    var marker = new google.maps.Marker({
      position: point,
      zIndex: data.t,
      icon: icon,
    });
    hitmap.mgr.addMarker(marker, 0);
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
    if(data.p == 'city') {
      var scriptTag = document.createElement('script');
      scriptTag.src = 'http://www.panoramio.com/map/get_panoramas.php' +
        '?order=popularity&set=public&from=0&to=24&minx=' + (data.lng - 0.01) +
        '&miny=' + (data.lat - 0.01) + '&maxx=' + (data.lng + 0.01) +
        '&maxy=' + (data.lat + 0.01) + '&callback=showPhotos&size=small&mapfilter=true';
      scriptTag.type = 'text/javascript';
      document.getElementsByTagName('head')[0].appendChild(scriptTag);
    }
  }
}

function showPhotos(photosJSON) {
  if (photosJSON.photos.length > 0) {
    try {
      var index = Math.floor(Math.random()*photosJSON.photos.length)
      //console.log(photosJSON.photos[index]);
//      hitmap.panoramioBlock.removeChild(hitmap.image);      
      hitmap.image.src = photosJSON.photos[index].photo_file_url;
      hitmap.imageLink.href = photosJSON.photos[index].photo_url;
//      hitmap.panoramioBlock.appendChild(hitmap.image);
    }catch(e){
      //console.log('Error: ');
      //console.log(e);
      //console.log(photosJSON);
    }
  }
}

function checkNearestStreetView(panoData){
    if(panoData){

        if(panoData.location){

          if(panoData.location.latLng){
            /**Well done you can use a nearest existing street viewcoordinates**/
            var imageUrl = 'http://maps.googleapis.com/maps/api/streetview?size=600x300&location=' + panoData.location.latLng.toUrlValue() + '&heading=' + panoData.links[1].heading + 
'pitch=-10&sensor=false';
            //console.log(imageUrl);
          }
        }
      }
    /** Else do something... **/
    }

$(document).ready(function(){
  hitmap.init();
});
