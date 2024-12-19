const express = require('express');
const router = express.Router();
const productController = require("../../controllers/Product.Controller");

// Routes
router.post('/products', productController.createProduct);          // Create
router.get('/products', productController.getAllProducts);          // Read All
router.get('/products/:id', productController.getProductById);      // Read One
router.put('/products/:id', productController.updateProduct);       // Update
router.delete('/products/:id', productController.deleteProduct);    // Delete

module.exports = router;
