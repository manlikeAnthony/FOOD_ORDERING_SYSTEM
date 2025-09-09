const express = require("express");
const router = express.Router();

const {
  createOrder,
  paystackCallback,
  getAllOrders,
  getAllMyOrders,
  getSingleOrder,
  updateOrderStatus,
  cancelOrder,
} = require("../controllers/orderController");
const {
  authenticateUser,
  authorizeRoles,
} = require("../middleware/authentication");

router.post("/", authenticateUser, createOrder);
router.get("/", authenticateUser, authorizeRoles("admin"), getAllOrders);
router.get("/my-orders", authenticateUser, getAllMyOrders);

router.get("/paystack/callback", paystackCallback);

router
  .route("/:id")
  .get(authenticateUser, getSingleOrder)
  .patch(authenticateUser, authorizeRoles("admin"), updateOrderStatus)
  .delete(authenticateUser, cancelOrder);



module.exports = router;
