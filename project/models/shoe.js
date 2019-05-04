var mongoose = require('mongoose');

var ShoeSchema=new mongoose.Schema({
    brand: String,
    type: String,
    name:String,
    color: String,
    price: Number,
    info: String,
    dis:Number,
    image:String,
    refID: String,
    addDate: Date
});

var Shoe = module.exports = mongoose.model('Shoe',ShoeSchema);
