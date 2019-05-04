var mongoose = require('mongoose');

var FavorSchema = mongoose.Schema({
  userid: String,
  brand: String,
  attempt:Number
});

var FavorBrand = module.exports = mongoose.model('FavorBrand',FavorSchema);
