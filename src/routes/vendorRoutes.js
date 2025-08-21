const express = require("express");
const router = express.Router();
const {
  authenticateUser,
  authorizeRoles,
} = require("../middleware/authentication");
const {
  applyAsVendor,
  approveVendor,
  getAllVendors,
  updateLogo,
  getMyVendorProfile,
  updateVendorProfile,
} = require("../controllers/vendorController");
const upload = require("../middleware/uploadMiddleware");

router.get("/", authenticateUser, authorizeRoles("admin"), getAllVendors);

router.post("/apply", authenticateUser, upload.single("logo"), applyAsVendor);

router.get("/me", authenticateUser, getMyVendorProfile);

router.patch(
  "/me",
  authenticateUser,
  authorizeRoles("vendor", "admin"),
  updateVendorProfile
);

router.patch(
  "/update-logo",
  authenticateUser,
  upload.single("logo"),
  updateLogo
);

router.patch(
  "/approve/:id",
  authenticateUser,
  authorizeRoles("admin"),
  approveVendor
);

module.exports = router;
