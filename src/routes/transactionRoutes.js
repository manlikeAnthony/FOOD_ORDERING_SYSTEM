const express = require("express");
const router = express.Router();

const {
  getAllTransactions,
  getAllUserTransactions,
  getSingleTransaction,
  getTransactionByReference
} = require("../controllers/transactionController");

const {
  authorizeRoles,
  authenticateUser,
} = require("../middleware/authentication");

router
  .route("/")
  .get([authenticateUser, authorizeRoles("admin")], getAllTransactions);

router.route("/user").get(authenticateUser, getAllUserTransactions);

router.route("/reference/:reference").get(authenticateUser, getTransactionByReference);

router.route("/:id").get(authenticateUser, getSingleTransaction);

module.exports = router;
