var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var mongo = require('mongodb');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/milenz',{ useNewUrlParser: true});
var db = mongoose.connection;
var dialog = require('dialog');

const multer = require('multer');
var fs=require('fs');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const crypto = require('crypto');

var routes = require('./routes/index'); // Index Routes
var admin = require('./routes/admin'); // Admin Routes


// Initalize E-Commerce App
var app = express();

// View Engine
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');

//Body parser Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method')); // For Method-override
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
//Express session
app.use(session({
  secret:'secret',
  saveUninitialized: true,
  resave: true,
  cookie: {
  maxAge: 8*60*60*1000  } // 8 housrs
}));


app.use(function(req, res, next) {
  res.locals.items = req.session;
  next();
});

//Set Static Folder
app.use('/css',express.static('css'));
app.use('/assets',express.static('assets'));




// Passport init
app.use(passport.initialize());
app.use(passport.session());

//Express validator
app.use(expressValidator({
  errorFormatter:function(param,msg,value){
    var namespace = param.split('.'),
    root = namespace.shift(),
     formParam = root;

     while(namespace.length){
       formParam += '[' + namespace.shift() + ']';
     }
     return {
       param : formParam,
       msg: msg,
       value: value
     };
  }
}));

//Connect flash
app.use(flash());

// Global Vars
app.use(function(req,res,next){
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});


app.use('/', routes);
app.use('/admin', admin); // app use Admin


// Set port
const port = 1313;
app.listen(port,()=>console.log('Server started on port ' + port ));
