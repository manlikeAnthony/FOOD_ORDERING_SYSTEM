const express = require("express");
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getSingleProduct,
  getVendorProducts,
  updateProduct,
  deleteProduct,
  toggleFavorite,
} = require("../controllers/productController");
const {
  authenticateUser,
  authorizeRoles,
} = require("../middleware/authentication");
const { getSingleProductReviews } = require("../controllers/reviewController");

router
  .route("/")
  .post([authenticateUser, authorizeRoles("vendor")], createProduct)
  .get(authenticateUser, getAllProducts);

router.route("/vendor/:id").get(authenticateUser, getVendorProducts);

router.route("/:id/favorite").post(authenticateUser, toggleFavorite);

router
  .route("/:id")
  .get(authenticateUser, getSingleProduct)
  .patch([authenticateUser, authorizeRoles("vendor")], updateProduct)
  .delete([authenticateUser, authorizeRoles("vendor")], deleteProduct);

router.route("/:id/reviews").get(getSingleProductReviews);

module.exports = router;
