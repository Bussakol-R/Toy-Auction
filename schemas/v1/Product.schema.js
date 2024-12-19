const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true }, // ชื่อสินค้า
    price: { type: Number, required: true }, // ราคาสินค้า
    description: { type: String, required: false }, // รายละเอียดสินค้า
    Instock: { type: Number, required: true, default: 0 } // สต็อกสินค้า
},{ Timestamp: true});

const Product = mongoose.model("Product", ProductSchema);

module.exports = Product;