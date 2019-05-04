var express = require('express');
var {ensureAuthenticated} = require('../config/auth');
var router = express.Router();
var passport = require('passport'); // Passport
var LocalStrategy = require('passport-local').Strategy; // Require Local

var Customer = require('../models/customer'); // Require Customer
var FavorBrand = require('../models/favorBrand'); // Require Customer


const multer = require('multer'); // Multer
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const crypto = require('crypto');
const path = require('path');
var mongo = require('mongodb');
var mongoose = require('mongoose');

// Init gfs
let gfs;

// create connection
const Mongo = 'mongodb://localhost/milenz';
var conn = mongoose.createConnection(Mongo,{ useNewUrlParser: true});


conn.once('open',() => {
  // Init Stream
 gfs = Grid(conn.db, mongoose.mongo);
 gfs.collection('wdress');

});


//Get User Login
router.get('/login', function(req,res){
  res.render('userlogin');
});

//Get User Register
router.get('/userregister', function(req,res){
  res.render('userRegister');
});


//Get Login
router.get('/', function(req,res){
  res.render('userlogin');
});


//Get Home Page
router.get('/home', ensureAuthenticated, function(req,res){
  var mysort = { 'metadata.Likes': -1 };
  gfs.collection('wdress').find().sort(mysort).toArray(function(err, result){
    conn.collection('favorbrands').find({}).toArray(function(error,favor){
      res.render('home', {
        name: req.user.name,
        isSearch:0,
        country: req.user.country,
        city:req.user.city,
        popular: result,
        id: req.user._id,
        favor: favor
      });

    });
  });
});


//Post Register
router.post('/register', function(req,res){
     // Get input from user
     var name = req.body.name;
	   var username = req.body.username;
	   var email = req.body.email;
	   var password = req.body.password;
	   var password2 = req.body.password2;
     var country = req.body.Country;
     var city = req.body.City;

     // Validation

    req.checkBody('name','Name is required').notEmpty();
    req.checkBody('username','Username is required').notEmpty();
    req.checkBody('email','Email is required').notEmpty();
    req.checkBody('email','Email is not valid').isEmail();
    req.checkBody('password','Password is required').notEmpty();
    req.checkBody('password2','Password is not matched').equals(req.body.password);

    var errors = req.validationErrors();

    // Check whether error found or not
    if(errors)
    {
      res.render('userregister', { errors:errors });
    }
    else {
     var newCustomer = new Customer({
     name:name,
     username:username,
     email:email,
     password:password,
     country: country,
     city: city
  });
  Customer.createUser(newCustomer,function(err,user){
    if(err) throw err;

  });

  req.flash('success_msg','You are registered successfully');
  res.redirect('/login');

 }

});

// Passport : User
passport.use(new LocalStrategy(
  function(username,password, done){
     Customer.getUserByUsername(username, function(err,user){
       if(err) throw err;
       if(!user){
         return done(null, false, {message: 'Unknown User'});
       }

       Customer.comparePassword(password,user.password,function(err, isMatch){
         if(err) throw err;
         if(isMatch){
           return done(null, user);
         } else {
              return done(null, false, {message:'Invalid password'});
         }
       });
     });
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  Customer.getUserById(id, function(err, user) {
    done(err, user);
  });
});


router.post('/login',
  passport.authenticate('local',{successRedirect:'/home', failureRedirect:'/login',failureFlash: true}),
  function(req,res){
      res.redirect('home');
});

/*------------------------------------------------------------Logout--------------------------------------------------------------------*/
router.get('/logout',(req,res)=>{
  req.logout();
  req.session.destroy(); // Session Destroy
  res.redirect('/login');
});

/*------------------------------------------------------- WOMEN DRESS DISPLAY SECTION ---------------------------------------------------*/


// Display women Dresses
router.get('/womensDresses',(req,res)=>{
  var coll = gfs.collection('wdress').find();
  gfs.files.find().toArray((err,files)=>{
    // Check if Files
    if(!files || files.length ===0)
    {
      res.render('userlogin',{files:false});
    } else{
      files.map(file=>{
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
        {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
    conn.collection('favorbrands').find({}).toArray(function(error,favor){
      coll.count().then((count) => {
        res.render('womensDresses',{
          files:files,
          count: count,
          num:4,
          route:'', // Set Path
          name: req.user.name, // Username
          isSearch:1, // Search Availability
          isConfirm: 1, // Switch Related Items
          country: req.user.country,
          id: req.user._id,
          favor: favor

        });
      });
     });
    }

  });
});


/*------------------------------------------------------------------- Display Shoes ----------------------------------------------*/
router.get('/shoes',(req,res)=>{
  var coll = conn.collection('shoes').find();
  conn.collection('shoes').find({}).toArray((err,files)=>{
    if(err) throw err;
    conn.collection('favorbrands').find({}).toArray(function(error,favor){
    coll.count().then((count) => {
         res.render('shoes',{
           files:files,
           count: count,
           num:4, // Search Availability
           name: req.user.name,
           isSearch: 2, // Search Availability
           country: req.user.country,
           id: req.user._id,
           favor: favor
           });
         });
       });
  });
});

// Display Single Shoe
router.get('/shoes/:shoename',(req,res)=>{
  const shoeID = req.params.shoename;
    conn.collection('shoes').findOne({refID : shoeID },(error,file) =>{
      // Add Recent View :
      if(error) {
          console.error('There was an error', error);
      }
       else if(file && req.session.recentView==null){
      req.session.recentView = [
        {
        imagename: file.image,
        nam: file.name,
        cat: file.type,
        price: file.price,
        brand: file.brand,
        refID: file.refID
        }
      ]
      console.log(req.session.recentView);
      }
       else if(file && req.session.recentView!=null){
        req.session.recentView.push({
          imagename: file.image,
          nam: file.name,
          cat: file.type,
          price: file.price,
          brand: file.brand,
          refID: file.refID
        });
        console.log(req.session.recentView);
      }
      else {
        console.log("No Items");
      }


      if(file && file.brand=="adidas"){
      const brand = "adidas";
       shoeOne(brand);
      }
      else if(file && file.brand=="vans")
      {
      const brand = "vans";
       shoeOne(brand);
      }
      else if(file && file.brand==null)
      {
       console.log("Null");
       }
    else{
        console.log("didinot find value")
       }


       // Function for : Related Brands
       function shoeOne(brand)
       {
         conn.collection('shoes').find({brand: brand }).toArray((err,files)=>{
          res.render('singleshoe',{
            result:file,
            relatedshoeProduct:files, // Related Products
            isSearch:0

          });
       });

    }


});
});




// Display Single Dress Product
router.get('/:filename', (req,res) => {
const img = req.params.filename; // Filename
  gfs.files.findOne({filename: img},(error,file) =>{


    // Add Recent View :
    if(error) {
        console.error('There was an error', error);
    }
     else if(file && req.session.recentView==null){
    req.session.recentView = [
      {
      filename: file.filename,
      nam: file.metadata.name,
      cat: file.metadata.cat,
      price: file.metadata.price,
      brand: file.metadata.brand
      }
    ]
    console.log(req.session.recentView);
    }
     else if(file && req.session.recentView!=null){
      req.session.recentView.push({
        filename: file.filename,
        nam: file.metadata.name,
        cat: file.metadata.cat,
        price: file.metadata.price,
        brand: file.metadata.brand
      });
      console.log(req.session.recentView);
    }
    else {
      console.log("No Items");
    }



/*--------------------------------------------*/

  if(file && file.metadata.brand=="Mango"){
  const brand = "Mango";
   displayOne(brand);
  }
  else if(file && file.metadata.brand=="Cocotail")
  {
  const brand = "Cocotail";
   displayOne(brand);
  }
  else if(file && file.metadata.brand==null)
  {
   console.log("Null");
   }
else{
    console.log("didinot find value")
   }




   // Function for : Related Brands
function displayOne(brand)
{
     gfs.files.find({'metadata.brand': brand }).toArray((err,files)=>{

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

      file.isImage = true;
    }
    else
    {
      res.status(404).json({
        err: 'Not an image'
      });
      file.isImage = false;
    }

  conn.collection('favorbrands').find({}).toArray(function(error,favor){
      res.render('singleproduct',{
        file:file,
        relatedProduct:files, // Related Products
        isSearch:0,
        id:req.user._id,
        favor: favor
    });
   });
 });

}


});
});


// Remove Recent viewed Dress
router.get('/delete/:filename',(req,res)=>{
  var file_name = parseInt(req.params.filename);
  var index = req.session.recentView.indexOf(file_name);
  req.session.recentView.splice(index,1);
  res.redirect('/womensDresses');
});

// Remove Recent viewed Shoe
router.get('/deleteShoe/:id',(req,res)=>{
  var file_name = parseInt(req.params.id);
  var index = req.session.recentView.indexOf(file_name);
  req.session.recentView.splice(index,1);
  res.redirect('/shoes');
});


// Display Image
router.get('/image/:filename', (req,res)=>{
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

/*------------------------------------------------------- WOMEN FAVORITE SECTION ---------------------------------------------------*/

// Single product : Favorite
router.get('/like/:filename', (req,res)=>{
  const image = req.params.filename;
    gfs.collection('wdress').updateOne({ filename:image}, {$inc:{'metadata.Likes':1}}, function(err, res) {
    if (err) throw err;
    });

  res.redirect('/womensDresses');
});
/*------------------------------------------------------- CATAGORY SELECTION ---------------------------------------------------*/


// Dress Catagory - Blouse
router.get('/catagory/blouse', (req,res)=>{
  let coll = gfs.collection('wdress').find({'metadata.cat':'Blouse'}); // Count for Blouse Items
  gfs.collection('wdress').find({'metadata.cat':'Blouse'}).toArray((err,files)=>{
    if(!files || files.length ===0)
    {
      res.redirect('/womensDresses');
    } else {
      files.map(file=>{
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
        {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });

     conn.collection('favorbrands').find({}).toArray(function(error,favor){
      coll.count().then((count) => {
        res.render('womensDresses',{
          files:files, // Image File
          count: count, // Products Found
          num:4, // Sort Analysing
          route:'/ Catagory / Blouse', // Set Path
          name: req.user.name, // Username
          isConfirm: 0, // Switch Related Items
          country: req.user.country,
          id: req.user._id,
          favor: favor
         });
        });
      });
    }
  });
});

// Dress Catagory - Dress
router.get('/catagory/dress', (req,res)=>{
  let coll = gfs.collection('wdress').find({'metadata.cat':'Dress'}); // Count for Blouse Items
  gfs.collection('wdress').find({'metadata.cat':'Dress'}).toArray((err,files)=>{
    if(!files || files.length ===0)
    {
      res.redirect('/womensDresses');
    } else {
      files.map(file=>{
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
        {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });

conn.collection('favorbrands').find({}).toArray(function(error,favor){
      coll.count().then((count) => {
        res.render('womensDresses',{
          files:files, // Image File
          count: count, // Products Found
          num:4, // Sort Analysing
          route:'/ Catagory / Dresses', // Set Path
          name: req.user.name, // Username
           isConfirm: 0, // Switch Related Items
           country: req.user.country,
           id: req.user._id,
           favor: favor
          });
        });
      });
    }
  });
});


// Dress Catagory - Coats
router.get('/catagory/coat', (req,res)=>{
  let coll = gfs.collection('wdress').find({'metadata.cat':'Coats'}); // Count for Blouse Items
  gfs.collection('wdress').find({'metadata.cat':'Coats'}).toArray((err,files)=>{
    if(!files || files.length ===0)
    {
      res.redirect('/womensDresses');
    } else {
      files.map(file=>{
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
        {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });

      conn.collection('favorbrands').find({}).toArray(function(error,favor){
      coll.count().then((count) => {
        res.render('womensDresses',{
          files:files, // Image File
          count: count, // Products Found
          num:4, // Sort Analysing
          route:'/ Catagory / Coats', // Set Path
          name: req.user.name, // Username
            isConfirm: 0, // Switch Related Items
            country: req.user.country,
            id: req.user._id,
            favor: favor
          });
        });
      });
    }
  });
});



// Dress Catagory - Jacket
router.get('/catagory/jacket', (req,res)=>{
  let coll = gfs.collection('wdress').find({'metadata.cat':'Jacket'}); // Count for Blouse Items
  gfs.collection('wdress').find({'metadata.cat':'Jacket'}).toArray((err,files)=>{
    if(!files || files.length ===0)
    {
      res.redirect('/womensDresses');
    } else {
      files.map(file=>{
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
        {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });

      conn.collection('favorbrands').find({}).toArray(function(error,favor){
      coll.count().then((count) => {
        res.render('womensDresses',{
          files:files, // Image File
          count: count, // Products Found
          num:4, // Sort Analysing
          route:'/ Catagory / Jacket', // Set Path
          name: req.user.name,// Username
            isConfirm: 0, // Switch Related Items
            country: req.user.country,
            id: req.user._id,
            favor: favor
          });
        });
      });
    }
  });
});


// Dress Catagory - Jeans
router.get('/catagory/jeans', (req,res)=>{
  let coll = gfs.collection('wdress').find({'metadata.cat':'Jeans'}); // Count for Blouse Items
  gfs.collection('wdress').find({'metadata.cat':'Jeans'}).toArray((err,files)=>{
    if(!files || files.length ===0)
    {
      res.redirect('/womensDresses');
    } else {
      files.map(file=>{
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
        {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });

   conn.collection('favorbrands').find({}).toArray(function(error,favor){
      coll.count().then((count) => {
        res.render('womensDresses',{
          files:files, // Image File
          count: count, // Products Found
          num:4, // Sort Analysing
          route:'/ Catagory / Jeans', // Set Path
          name: req.user.name, // Username
            isConfirm: 0, // Switch Related Items
            country: req.user.country,
            id: req.user._id,
            favor: favor
         });
        });
      });
    }
  });
});


// Display Image Catagories Dresses
router.get('/catagory/image/:filename', (req,res)=>{
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

/*------------------------------------------------------- BRAND SELECTION ---------------------------------------------------*/

// Mango - Brand Selection
router.get('/brand/mango', (req,res)=>{
let coll = gfs.collection('wdress').find({'metadata.brand':'Mango'});
gfs.collection('wdress').find({'metadata.brand':'Mango'}).toArray((err,files)=>{
  if(!files || files.length ===0)
  {
    res.redirect('/womensDresses');
  } else{
    files.map(file=>{
      if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
      {
        file.isImage = true;
      } else {
        file.isImage = false;
      }
    });

  conn.collection('favorbrands').find({}).toArray(function(error,favor){
    coll.count().then((count) => {
      res.render('womensDresses',{
        files:files, // Image File
        count: count, // Products Found
        num:4, // Sort Analysing
        route:'/ Brand /Mango', // Set Path
        name: req.user.name, // Username
          isConfirm: 0, // Switch Related Items
          country: req.user.country,
          id: req.user._id,
          favor: favor
       });
      });
    });
  }
});
});

// Cocotail - Brand Selection
router.get('/brand/coco', (req,res)=>{
let coll = gfs.collection('wdress').find({'metadata.brand':'Cocotail'});
gfs.collection('wdress').find({'metadata.brand':'Cocotail'}).toArray((err,files)=>{
  if(!files || files.length ===0)
  {
    res.redirect('/womensDresses');
  } else{
    files.map(file=>{
      if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
      {
        file.isImage = true;
      } else {
        file.isImage = false;
      }
    });
    conn.collection('favorbrands').find({}).toArray(function(error,favor){
    coll.count().then((count) => {
      res.render('womensDresses',{
        files:files, // Image File
        count: count, // Products Found
        num:4, // Sort Analysing
        route:'/ Brand / Cocotail', // Set Path
        name: req.user.name, // Username
          isConfirm: 0, // Switch Related Items
          country: req.user.country,
          id: req.user._id,
          favor: favor
        });
      });
    });

  }
  });
});



// Display Image Brand Dresses
router.get('/brand/image/:filename', (req,res)=>{
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

/*------------------------------------------------------- SORT SELECTION ---------------------------------------------------*/


// Sort Dresses - Latest
router.get('/sort/latest',(req,res)=>{
  var mysort = { uploadDate: -1 };
  var coll = gfs.collection('wdress').find();
  gfs.collection('wdress').find().sort(mysort).toArray(function(err, result) {
    if(!result || result.length ===0)
    {
      res.redirect('/womensDresses');
    } else{
      result.map(file=>{
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
        {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
    conn.collection('favorbrands').find({}).toArray(function(error,favor){
      coll.count().then((count) => {
        res.render('womensDresses',{
          files:result, // Image File
          count: count, // Prduct Found
          num:1, // Sort Analysing
          route:'/ Sort / Latest', // Set Path
          name: req.user.name, // Username
          country: req.user.country,
          id: req.user._id,
          favor: favor
        });
        });
      });
    }
  });
});

// Sort Dresses - Older
router.get('/sort/older',(req,res)=>{
  var mysort = { uploadDate: 1 };
  var coll = gfs.collection('wdress').find();
  gfs.collection('wdress').find().sort(mysort).toArray(function(err, result) {
    if(!result || result.length ===0)
    {
      res.redirect('/womensDresses');
    } else{
      result.map(file=>{
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
        {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      conn.collection('favorbrands').find({}).toArray(function(error,favor){
      coll.count().then((count) => {
        res.render('womensDresses',{
          files:result,
          count: count,
          num:2,
          route:'/ Sort / Older', // Set Path
          name: req.user.name, // Username
          country: req.user.country,
          id: req.user._id,
          favor: favor
          });
        });
      });
    }
  });
});

// Sort Dresses - Liked
router.get('/sort/liked',(req,res)=>{
  var mysort = { 'metadata.Likes': -1 };
  var coll = gfs.collection('wdress').find();

  gfs.collection('wdress').find().sort(mysort).toArray(function(err, result) {
    if(!result || result.length ===0)
    {
      res.redirect('/womensDresses');
    } else{
      result.map(file=>{
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png')
        {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      conn.collection('favorbrands').find({}).toArray(function(error,favor){
      coll.count().then((count) => {
        res.render('womensDresses',{
          files:result,
          count: count,
          num:3,
          route:'/ Sort / Most Liked', // Set Path
          name: req.user.name, // Username
          country: req.user.country,
          id: req.user._id,
          favor: favor
         });
        });
      });
    }
  });
});

// Display Sorting Images
router.get('/sort/image/:filename', (req,res)=>{
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


// Search Women Item
router.post('/womensearch',(req,res)=>{
  const searchItem = req.body.womenitem;
  // If it is Catagory
  gfs.collection('wdress').find({
        $and:[{ $or : [{'metadata.cat': searchItem},{'metadata.brand': searchItem}]}]
       }).toArray((err,files)=>{
        res.json(files);

      });
});

// Search Women Shoe Item
router.post('/womenShoesearch',(req,res)=>{
  const searchItem = req.body.womenitem;
  // If it is Catagory
  conn.collection('shoes').find({
        $and:[{ $or : [{type: searchItem},{brand: searchItem}]}]
       }).toArray((err,files)=>{
        res.json(files);
      });
});


// Add to Cart - Shoe
router.post('/shoecart',(req,res)=>{
  var id = req.body.imgID;
  var size = req.body.size;
  conn.collection('shoes').findOne({refID: id},{},function(errors,items){
    // Check items has discount
    if(items.dis==0)
    {
      // Check session full
      if(req.session.cart==null)
      {
        req.session.cart = [{
          shoeitems : items.image,
          brand: items.brand,
          price: items.price,
          name: items.name,
          color: items.color,
          qua : 1,
          size : size
        }]
      }  else {
             req.session.cart.push({
               shoeitems : items.image,
               brand: items.brand,
               price: items.price,
               name: items.name,
               color: items.color,
               qua : 1,
               size : size
             });
          }
    }
    else if(items.dis>0)
    {
      const price = items.price;
      const dis = items.dis;
      const dis_value = (price/100)*dis;
      const final_price = price-dis_value;

          if(req.session.cart == null)
          {
            req.session.cart = [
              {
                shoeitems : items.image,
                brand: items.brand,
                price: final_price,
                name: items.name,
                color: items.color,
                qua : 1,
                size : size
              }
            ]
          }  else {
               req.session.cart.push({
                 shoeitems : items.image,
                 brand: items.brand,
                 price: final_price,
                 name: items.name,
                 color: items.color,
                 qua : 1,
                 size : size
               });
            }
         }


                 items.cart = req.session.cart;
                 console.log(items.cart);
                 res.json(items.cart);

  });
});

// Add to Cart - Dress

router.post('/cart',(req,res)=>{
  var id = req.body.imgID;
  var size = req.body.size;
  gfs.files.findOne({filename: id},{},function(errors,items){
  if(items.metadata.dis==0){
    if(req.session.cart == null)
    {
      req.session.cart = [
        {
          items : items.filename,
          brand: items.metadata.brand,
          price: items.metadata.price,
          name: items.metadata.name,
          color: items.metadata.color,
          qua : 1,
          size : size
        }
      ]
    }
    else {
       req.session.cart.push({
         items : items.filename,
         brand: items.metadata.brand,
         price: items.metadata.price,
         name: items.metadata.name,
         color: items.metadata.color,
         qua : 1,
         size : size
       })
    }
  } else if(items.metadata.dis>0)
  {
    const price = items.metadata.price;
    const dis = items.metadata.dis;
    const dis_value = (price/100)*dis;
    const final_price = price-dis_value;

    if(req.session.cart == null)
    {
      req.session.cart = [
        {
          items : items.filename,
          brand: items.metadata.brand,
          price: final_price,
          name: items.metadata.name,
          color: items.metadata.color,
          qua : 1,
          size : size
        }
      ]
    }
    else {
       req.session.cart.push({
         items : items.filename,
         brand: items.metadata.brand,
         price: final_price,
         name: items.metadata.name,
         color: items.metadata.color,
         qua : 1,
         size : size
       })
    }
  }

        items.cart = req.session.cart;
        console.log(items.cart);
        res.json(items.cart);

  });

});


/* Weather Analysing */
router.post('/weather',(req,res)=>{
   var weather = req.body.weather; // Get Weather
   gfs.files.find({'metadata.weather': weather}).toArray((err,files)=>{
      res.json(files);
   });
});


/* You may like */
router.post('/color',(req,res)=>{
  var color = req.body.color;
  conn.collection('shoes').find({color:color}).toArray((err,files)=>{
      res.json(files);
  });
});


/* Check out */
router.get('/products/checkout',(req,res)=>{
  res.render('checkout');
});

/* Personalization - Brand */
router.post('/favor/brand',(req,res)=>{
  const id = req.body.id;
  const brand = req.body.brand;

  ifContains(id,brand); // Function : Checks already exist or not

});

function ifContains(userid,brand)
{
    conn.collection('favorbrands').find({$and:[{ $and : [{userid: userid},{brand: brand}]}]}).toArray((err,branditems)=>{
        if(branditems.length>0)
        {
          conn.collection('favorbrands').updateOne({ userid:userid, brand: brand}, {$inc:{attempt:1}}, function(err, res) {});
        } else {
            let favor_brand = new FavorBrand({
              userid: userid,
              brand: brand,
              attempt:1
            });

            FavorBrand(favor_brand).save(function(err,data){
                if(err) throw err;
            });
        }
    });
}

// Remove Nav Item
router.post('/nav/remove',(req,res)=>{
  var item = req.body.brandItem ;
  var user = req.body.user;
  conn.collection('favorbrands').remove({$and:[{ $and : [{userid: user},{brand: item}]}]}, (err,branditems)=>{
      if (err) throw err;
      res.redirect('/home');
  });
});
/* --------------------------------------END -----------------------------------------------------------------*/


/*------------------------------------------------------- EXPORT ---------------------------------------------------*/
module.exports = router; // Routing
