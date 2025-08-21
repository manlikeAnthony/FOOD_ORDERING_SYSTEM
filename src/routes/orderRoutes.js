const express = require("express");
const router = express.Router();

const {
  createOrder,
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

router.get("/success", (req, res) => {
  res.send("<h1>You were successful in paying</h1>");
});
router.get("/cancel", (req, res) => {
  res.send("<h1>You were not successful in paying</h1>");
});
router
  .route("/:id")
  .get(authenticateUser, getSingleOrder)
  .patch(authenticateUser, authorizeRoles("admin"), updateOrderStatus)
  .delete(authenticateUser, cancelOrder);



module.exports = router;
