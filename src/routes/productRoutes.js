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
  updateProductImage,
} = require("../controllers/productController");
const {
  authenticateUser,
  authorizeRoles,
} = require("../middleware/authentication");
const { getSingleProductReviews } = require("../controllers/reviewController");
const upload = require("../middleware/uploadMiddleware");

router
  .route("/")
  .post(
    [authenticateUser, authorizeRoles("vendor"), upload.single("image")],
    createProduct
  );

router.route("/vendor/:id").get(authenticateUser, getVendorProducts);

router
  .route("/update-image/:id")
  .patch(authenticateUser, upload.single("image"), updateProductImage);

router.route("/:id/favorite").post(authenticateUser, toggleFavorite);

router
  .route("/:id")
  .get(authenticateUser, getSingleProduct)
  .patch([authenticateUser, authorizeRoles("vendor")], updateProduct)
  .delete([authenticateUser, authorizeRoles("vendor")], deleteProduct);

router.route("/:id/reviews").get(getSingleProductReviews);

module.exports = router;
