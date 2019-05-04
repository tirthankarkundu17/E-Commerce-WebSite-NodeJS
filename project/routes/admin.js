var express = require('express');
var router = express.Router();

const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const crypto = require('crypto');
const path = require('path');

const uuidv4 = require('uuid/v4'); //Unique ID

var mongo = require('mongodb');
var mongoose = require('mongoose');


var Shoe = require('../models/shoe'); // Require Shoe

// Init gfs
let gfs;

// Get Home Page
router.get('/home', (req,res) => {
  res.render('admin/home');
});

// Get Women Dress Page
router.get('/Wdress', (req,res) => {
  gfs.collection('wdress').find().toArray((err,files)=>{
      res.render('admin/Wdress',{
        files : files
      });
  });
});

// Get Women Shoe Page
router.get('/shoe',(req,res)=>{
  res.render('admin/shoe');
});

// create connection
const Mongo = 'mongodb://localhost/milenz';
var conn = mongoose.createConnection(Mongo,{ useNewUrlParser: true});

conn.once('open',() => {
  // Init Stream
 gfs = Grid(conn.db, mongoose.mongo);
// gfs.collection('wdress');

});


// Create Storage engine - Dresses
var storage = new GridFsStorage({
  url: Mongo,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'wdress',
          metadata: {
          'brand': req.body.brand,
          'cat': req.body.cat,
          'name': req.body.name,
          'color': req.body.color,
          'price': req.body.price,
          'info': req.body.info,
          'dis': req.body.discount,
          'Likes': 0,
          'weather': req.body.weather

          }
      };
        resolve(fileInfo);
      });
    });
  }
});
const upload = multer({ storage });

// Upload Women Dress Image To DB
router.post('/wdress', upload.single('pic'), (req,res)=> {
  req.flash('success_msg','You are successfully stored');
  res.redirect('/admin/Wdress');
});

// Edit
router.get('/edit/:filename',(req,res)=>{
    gfs.collection("wdress").findOne({filename: req.params.filename}, (req,file) =>{
       res.render('admin/wdress',{
         file:file
       });
    });

});

router.post('/update',(req,res)=>{
  const brand = req.body.update_brand
  console.log(brand);
});

// Delete Women Dress
router.get('/delete/:filename',(req,res)=>{
  const file_name = req.params.filename;
  const myquery = {filename: file_name };
  gfs.collection("wdress").remove(myquery, function(err, obj) {
    if (err) throw err;
    req.flash('success_msg','You are successfully deleted');
    res.redirect('/admin/Wdress');


  });

});

// Display Image on Table
router.get('admin/image/:filename', (req,res)=>{
  gfs.files.findOne({filename: req.params.filename}, (req,file) =>{
    // Check if File
    if(!file || file.length ===0)
    {
      return res.status(404).json({
        err: 'No files exist'
      });
    }
    // Check if image
    if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
    {
      // Read output tp browser
      var readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    }
    else
    {
      res.status(404).json({
        err: 'Not an image'
      });
    }
  });
});




// Upload - Shoe Details
var shoe_storage = multer.diskStorage({
    destination: 'assets/uploads/',
    filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now()+ '.jpg')
    }
});

var shoe_upload = multer({ storage: shoe_storage });



router.post('/add_shoe',shoe_upload.single('shoe_pic'),function(req,res){
var postID = 'shoe - ' + ((Math.random() * 1e6) | 0); // Geberate ID
let shoe_data = new Shoe({
  brand: req.body.shoe_brand,
  type: req.body.shoe_type,
  name:req.body.shoe_name,
  color: req.body.shoe_color,
  price: req.body.shoe_price,
  info: req.body.shoe_info,
  dis:req.body.shoe_discount,
  image: req.file.path,
  refID: postID,
  addDate: Date()
});

Shoe(shoe_data ).save(function(err,data){
        if(err) throw err
        //res.json(data);
        console.log(data);
        req.flash('success_msg','You are successfully stored');
        res.redirect('/admin/shoe');
   });
});



/*-------- Module Export --------*/
module.exports = router;
