const express = require("express");
const router = express.Router();
const {
  authenticateUser,
  authorizeRoles,
} = require("../middleware/authentication");

const {
  getEveryone,
  getAllAdmins,
  getAllUsers,
  getSingleUser,
  showCurrentUser,
  deleteUser,
} = require("../controllers/userController");

router.route("/").get(authenticateUser, authorizeRoles("admin"), getAllUsers);

router
  .route("/everyone")
  .get(authenticateUser, authorizeRoles("admin"), getEveryone);

router
  .route("/admins")
  .get(authenticateUser, authorizeRoles("admin"), getAllAdmins);

router.route("/showMe").get(authenticateUser, showCurrentUser);

router
  .route("/:id")
  .get(authenticateUser, getSingleUser)
  .delete(authenticateUser, deleteUser);

module.exports = router;
