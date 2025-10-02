const express = require("express");
const router = express.Router();
const {
  makeUserAnAdmin,
  approveVendor,
  getEveryone,
  getAllAdmins,
  getAllUsers,
  getAllDeliveryGuys,
  banUser,
  liftBan,
  getAllTransactions,
} = require("../controllers/adminController");

const {
  authenticateUser,
  authorizeRoles,
} = require("../middleware/authentication");

router
  .route("/")
  .get([authenticateUser, authorizeRoles("admin")], getAllAdmins);
router
  .route("/users")
  .get([authenticateUser, authorizeRoles("admin")], getAllUsers);
router
  .route("/transactions")
  .get([authenticateUser, authorizeRoles("admin")], getAllTransactions);
router
  .route("/delivery-guys")
  .get([authenticateUser, authorizeRoles("admin")], getAllDeliveryGuys);
router
  .route("/get-everyone")
  .get([authenticateUser, authorizeRoles("admin")], getEveryone);
router
  .route("/ban/:id")
  .patch([authenticateUser, authorizeRoles("admin")], banUser);
router
  .route("/lift-ban/:id")
  .patch([authenticateUser, authorizeRoles("admin")], liftBan);
router
  .route("/approve-vendor/:id")
  .patch([authenticateUser, authorizeRoles("admin")], approveVendor);
router
  .route("/make-admin/:id")
  .patch([authenticateUser, authorizeRoles("admin")], makeUserAnAdmin);

module.exports = router;
