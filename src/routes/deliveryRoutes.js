// routes/deliveryRoutes.js
const express = require("express");
const router = express.Router();

const {
  applyAsDeliveryGuy,
  getAllDeliveryGuys,
  toggleDeliveryStatus,
  markOrderDelivered,
  getAvailableDeliveries,
  claimDelivery,
  getMyCurrentDelivery,
  getMyDeliveryHistory,
  cancelDelivery
} = require("../controllers/deliveryController");

const {
  authorizeRoles,
  authenticateUser,
} = require("../middleware/authentication");

router
  .route("/")
  .get([authenticateUser, authorizeRoles("admin")], getAllDeliveryGuys);

router.route("/apply").post(authenticateUser, applyAsDeliveryGuy);

router.get(
  "/available",
  [authenticateUser, authorizeRoles("delivery")],
  getAvailableDeliveries
);

router.get(
  "/my-current",
  [authenticateUser, authorizeRoles("delivery")],
  getMyCurrentDelivery
);

router.get(
  "/my-history",
  [authenticateUser, authorizeRoles("delivery")],
  getMyDeliveryHistory
);

router
  .route("/toggle-status")
  .patch([authenticateUser, authorizeRoles("delivery")], toggleDeliveryStatus);

router.patch("/:deliveryId/delivered", [authenticateUser, authorizeRoles("delivery")], markOrderDelivered);

router.patch(
  "/:deliveryId/cancel",
  [authenticateUser, authorizeRoles("delivery")],
  cancelDelivery
);

router.post(
  "/claim/:deliveryId",
  [authenticateUser, authorizeRoles("delivery")],
  claimDelivery
);

module.exports = router;
