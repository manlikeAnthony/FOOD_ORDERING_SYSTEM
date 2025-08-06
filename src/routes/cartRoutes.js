const express = require("express");
const router = express.Router();
const {
  addToCart,
  getCart,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");

const { authenticateUser } = require("../middleware/authentication");

router.route("/")
  .post(authenticateUser, addToCart)
  .get(authenticateUser, getCart)
  .delete(authenticateUser, clearCart);

router.route("/:productId")
  .delete(authenticateUser, removeFromCart);

module.exports = router;
