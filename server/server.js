/**
 * Easier Javascript Apps with AngularJS
 * Node Server
 *
 * See the README.md for instructions.
 */

var path = require('path'),
    fs = require('fs'),
    http = require('http'),
    express = require('express');

// ========================
// Database
// ========================

var mongoose =
      require('mongoose')
        .connect("mongodb://localhost:27017/angular-resource"),
    db = mongoose.connection;

mongoose
  .set('debug', true);

db
  .on('error', console.error.bind(console, 'Connection Error.'))
  .once('open', console.log.bind(console, "We have connected."));

// Schemas

var contactSchema = new mongoose.Schema({
  name: {
    first: { type: String, default: '' },
    last: { type: String, default: '' },
    clean: { type: String, default: '', unique: true }
  },
  email: { type: String, default: '' },
  number: { type: String, default: '' },
  notes: { type: String, default: '' },
  added: Date
});

contactSchema
  // Index on important fields
  .index({ name: { last: 1, clean: 1 }, email: 1 })
  // Make sure document has 'added' field when first saved
  .pre('save', function (next) {
    if( !this.added ) this.added = new Date();
    this.name.clean = (this.name.first + '-' + this.name.last).toLowerCase();
    next();
  });

// Models

var Contact = mongoose.model('Contact', contactSchema);

// ========================
// Server
// ========================

// Setup the server
var app =
  express()
    .set('port', process.env.PORT || 9000)
    // The route base is ../app
    .set('views', path.resolve(__dirname, '../app'))
    // Render html by just spitting the file out
    .set('view engine', 'html')
    .engine('html', function (path, options, fn) {
      if ('function' == typeof options) {
        fn = options, options = {};
      }
      fs.readFile(path, 'utf8', fn);
    })
    .use(express.favicon())
    .use(express.bodyParser())
    .use(express.logger('dev'))
    // Serve the app folder statically
    .use(express.static(path.resolve(__dirname, '../app')));

// ========================
// API
// ========================

app
  // Get all contacts
  .get('/api/contact', function (req, res, next) {
    Contact
      .find(null, { _id: 0 })
      .sort('name.last')
      .exec(function (err, contacts) {
        if( err ) return res.send(500, err);
        if( !contacts ) return res.send(404, new Error("Contacts not found."));
        res.send(contacts);
      });
  })
  // Get a single contact
  .get('/api/contact/:name', function (req, res, next) {
    Contact
      .findOne({ 'name.clean': req.params.name  }, { _id: 0 })
      .exec(function (err, contact) {
        if( err ) return res.send(500, err);
        if( !contact ) return res.send(404, new Error("Contact not found."));
        res.send(contact);
      });
  })
  // Update a contact
  .post('/api/contact/:name', function (req, res, next) {
    Contact
      .findOne({ 'name.clean': req.params.name })
      .exec(function (err, contact) {
        if( err ) return res.send(500, err);
        if( !contact ) return res.send(404, new Error("Contact not found."));
        // Not sure I should have to do this, but can't find an alternative.
        contact.name.first = req.body.name.first;
        contact.name.last = req.body.name.last;
        contact.email = req.body.email;
        contact.number = req.body.number;
        contact.notes = req.body.notes;
        contact.save(function (err, contact) {
          if( err ) return res.send(500, err);
          res.send(contact);
        });
      });
  })
  // Create a contact
  .post('/api/contact', function (req, res, next) {
    var contact = new Contact(req.body);
    contact.save(function (err, contact) {
      if( err ) return res.send(500, err);
      res.send(contact);
    });
  });

// ========================
// App
// ========================

app
  // Point all requests at one file
  .get('*', function (req, res) {
    res.render('index.html', { layout: null });
  });

app
  .use(app.router)
  .use(express.errorHandler({ dumpExceptions: true, showStack: true }));

// ========================
// Go, go, go!
// ========================

http.createServer(app).listen(app.get('port'), function(){
  console.log("Server listening on port " + app.get('port'));
});