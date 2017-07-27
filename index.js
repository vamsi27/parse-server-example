// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
  databaseURI: 'mongodb://YourTurnAdmin:678Yourturn@ds133311.mlab.com:33311/heroku_tm717sjz',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: 'yourTurn3262017',
  masterKey: 'yourTurn3262017_master', //Add your master key here. Keep it secret!
  serverURL: 'https://your-turn.herokuapp.com/parse',  // Don't forget to change to https if needed
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  },
  push: {
    //android: {
      //senderId: '...',
      //apiKey: '...'
    //},
    ios: [
      {
        pfx: 'YourTurnP12Certificate.p12',
        passphrase: 'Krishna1!', // optional password to your p12/PFX //TODO: setup a password
        //bundleId: 'com.vmzi.YourTurn', //bundleId is depracated, use topic instead
        topic: 'com.vmzi.YourTurn', 
        production: false
      },
      {
        pfx: 'DistributionP12new.p12',
        passphrase: 'Krishna1!', 
        topic: 'com.vmzi.YourTurn', 
        production: true
      }
    ]
  }
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
