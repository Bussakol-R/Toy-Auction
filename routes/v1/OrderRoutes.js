const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/Order.Controller');

// CRUD Routes
router.post('/orders', orderController.createOrder); // Create Order
router.get('/orders', orderController.getAllOrders); // Read All Orders
router.get('/orders/user/:userId', orderController.getOrdersByUser); // Read Orders by User
router.get('/orders/:orderId', orderController.getOrderById); // Read Single Order by ID
router.put('/orders/:orderId', orderController.updateOrder); // Update Order
router.delete('/orders/:orderId', orderController.deleteOrder); // Delete Order

module.exports = router;
