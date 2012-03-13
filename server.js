/**
 * Module dependencies.
 */
var express = require('express');

var app = express.createServer();

var io = require('socket.io');

var http = require('http');

var geoip = require('geoip');
var City = geoip.City;
var city = new City('/usr/share/GeoIP/GeoLiteCity.dat');

var hitcount = 0;
var hitbuffer = new Array();
var timestamp = new Date().getTime();
while (hitbuffer.length < 300) hitbuffer.unshift([timestamp-=1000, null]);

setInterval(function() {
  timestamp = new Date().getTime();
  io.sockets.emit('graphdata', [timestamp, hitcount]);

  while (hitbuffer.length >= 300) hitbuffer.shift();
  
  hitbuffer.push([timestamp, hitcount]);
  hitcount = 0;
}, 1000);

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
//  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  res.render('index', {
    locals: {
      title: 'Express'
    }
  });
});

var http = require('http');
var url = require('url');

app.get('/b.js', function(req, res, next){
  hitcount++;
  var timestamp = new Date().getTime();
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
      console.log(data);
      var precision = null;
      if (data.city != null) {
        precision = 'city';
      }else if (data.country_code != null) {
        precision = 'country';
      }
      var hit = {'t': timestamp, 'lat': data.latitude, 'lng': data.longitude, 'r': referrer, 'p': precision};
      io.sockets.emit('m', hit);
    }
  });

  res.writeHead(200, {'Content-Type': 'application/x-javascript'});
  res.end('var t=' + timestamp + ';');
  //next();
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

var io = io.listen(app)
  , buffer = [];

io.sockets.on('connection', function (socket) {
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
//    , 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ]);
});
