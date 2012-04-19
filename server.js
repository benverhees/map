/**
 * Module dependencies.
 */
var express = require('express'),
  app = express.createServer(),
  io = require('socket.io'),
  http = require('http'),
  url = require('url'),
  request = require('request'),
  geoip = require('geoip'),
  City = geoip.City,
  city = new City('/usr/share/GeoIP/GeoLiteCity.dat'),
  hitcount = 0,
  lastimagedate = new Date().getTime(),
  images = new Array(),
  hitbuffer = new Array(),
  timestamp = new Date().getTime(),
//  phantom = require('phantom'),
  async = require('async');

while (hitbuffer.length < 300) hitbuffer.unshift([timestamp-=1000, null]);

setInterval(function() {
  timestamp = new Date().getTime();
  io.sockets.emit('graphdata', [timestamp, hitcount, images]);
  while (hitbuffer.length >= 300) hitbuffer.shift();
  hitbuffer.push([timestamp, hitcount, images]);
  hitcount = 0;
  images = new Array();
}, 1000);

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

app.get('/', function(req, res){
  
  res.render('index', {
    locals: {
      title: 'Express'
    }
  });
});

app.get('/b.js', function(req, res, next){
  var timestamp = new Date().getTime();

  if (req.header('user-agent').indexOf('CutyCapt') == -1) {
    hitcount++;

    var referrer = req.param('referrer') || req.header('Referrer') || req.url;
    var clientip = req.param('ip') || req.header('X-Forwarded-For') || req.connection.remoteAddress;

    if(clientip == 'random') {
      clientip = getRandomInRange(1, 255, new Array(10, 172, 192)) + '.' + getRandomInRange(1, 255) + '.' + getRandomInRange(1, 255) + '.' + getRandomInRange(1, 255);
    }else if(clientip.substring(0, 3) === '172'){
      clientip = '193.172.8.38';
    }

    //use geoip plugin  
    city.lookup(clientip, function(err, data) {
      if (err && err.message != 'Data not found') {
        console.log(err);
      }
      if (data) {
        var precision = null;
        if (data.city != null) {
          precision = 'city';
        }else if (data.country_code != null) {
          precision = 'country';
        }

        var hit = {'t': timestamp, 'lat': data.latitude, 'lng': data.longitude, 'r': referrer, 'p': precision, 'i': null };

        //api.snapito.com/free/lc?url=www.colours.nl
        //icon url parameter ipv referrer favicon

        async.parallel({
/*
          screenshot: function(callback){
            phantom.create(function(ph){
              ph.createPage(function(page){
                page.set('viewportSize', { width: 1024, height: 768 });
                page.open(referrer, function (status) {
                  if (status !== 'success') {
                    console.log('Unable to load ' + referrer);
                    callback('Unable to load ' + referrer, null);
                  } else {
                    setTimeout(function(){
                      page.render(__dirname + '/public/screenshots/' + referrer + '.png', function(){
                        callback(null, {
                          src: '/public/screenshots/' + referrer + '.png',
                          url: referrer,
                          width: 1024,
                          height: 768
                        });
                      });
                      ph.exit();
                    }, 300);
                  }
                });
              });
            });
          },
*/
          panoramio: function(callback){
            if(timestamp - lastimagedate > 5000 &&  precision == 'city') {
              lastimagedate = new Date().getTime();
              var options = {
                timeout: 2000,
                url: 'http://www.panoramio.com/map/get_panoramas.php?',
                qs: {
                  set: 'public',
                  from: 0,
                  to: 30,
                  minx: data.longitude - 0.01,
                  maxx: data.longitude + 0.01,
                  miny: data.latitude - 0.01,
                  maxy: data.latitude + 0.01,
                  size: 'medium',
                  mapfilter: 'true'
                }
              };
              request.get(options, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                  var panoramio;
                  try {
                    panoramio = JSON.parse(body);
                  }catch(e){
                    console.log(e);
                    callback(e, null);
                  }
                  if(panoramio.photos.length > 0) {
                    var index = Math.floor(Math.random()*panoramio.photos.length)
                    //images.push(panoramio.photos[index].photo_file_url.replace('medium', 'mini_square'));
                    callback(null, {
                      src: panoramio.photos[index].photo_file_url,
                      url: panoramio.photos[index].photo_url,
                      width: panoramio.photos[index].width,
                      height: panoramio.photos[index].height
                    });
                  }
                }
              });
            }else{
              callback(null, null);
            }
          }
        },
        function(err, results) {
          if(results.panoramio){
            hit.i = results.panoramio;
          }else if(results.screenshot){
            hit.i = results.screenshot;
          }
          //io.sockets.in(referrer).emit('m', hit);
          io.sockets.emit('m', hit);
        });
      }
    });
  }
  
  res.writeHead(200, {'Content-Type': 'application/x-javascript'});
  res.end('var t=' + timestamp + ';');

});

function getRandomInRange(from, to, exclude, fixed) {
    var random = (Math.random() * (to - from) + from).toFixed(fixed) * 1;
    if(exclude) {
      for (i = 0; i < exclude.length; i++){
        if (exclude[i] == random) return getRandomInRange(from, to, exclude, fixed);
      }
    }
    return random;
    // .toFixed() returns string, so ' * 1' is a trick to convert to number
}

app.listen(15623);
var io = io.listen(app);

io.sockets.on('connection', function (socket) {
  //socket.join('http://www.colours.nl');
  if(hitbuffer) {
    socket.emit('graphdata', { buffer: hitbuffer} );
  }
});

io.configure(function(){
//  io.enable('browser client minification');  // send minified client
//  io.enable('browser client etag');          // apply etag caching logic based on version number
//  io.enable('browser client gzip');          // gzip the file
  io.set('log level', 1);                    // reduce logging
  io.set('max reconnection attempts', 5);
  io.set('transports', [                     // enable all transports (optional if you want flashsocket)
      'websocket'
    , 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ]);
});
