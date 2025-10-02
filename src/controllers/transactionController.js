const Transaction = require("../models/Transaction");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const response = require("../responses/response");
const checkPermissions = require("../utils/checkPermissions");

const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({})
      .populate("user", "name email")
      .populate("vendor", "name email");

    res.status(StatusCodes.OK).json(
      response({
        msg: "All Transactions retrived successfully",
        data: { count: transactions.length, transactions },
      })
    );
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const getAllUserTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.userId })
      .populate("user", "name email")
      .populate("vendor", "name email");

    res.status(StatusCodes.OK).json(
      response({
        msg: "All Transactions retrived successfully",
        data: { count: transactions.length, transactions },
      })
    );
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};
const getSingleTransaction = async (req, res) => {
  try {
    const { id: transactionId } = req.params;

    const transaction = await Transaction.findById(transactionId)
      .populate("user", "name email")
      .populate("vendor", "name email");

    if (!transaction) {
      throw new CustomError.NotFoundError(
        `no transaction with id ${transactionId} found`
      );
    }

    checkPermissions(req.user, transaction.user._id);

    res.status(StatusCodes.OK).json(
      response({
        msg: "Transaction retrived successfully",
        data: transaction,
      })
    );
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const getTransactionByReference = async (req, res) => {
  try {
    const { reference  } = req.query;
    const transaction = await Transaction.findOne({ reference: reference })
      .populate("user", "name email")
      .populate("vendor", "name email");

    if (!transaction) {
      throw new CustomError.NotFoundError(
        `no transaction with reference "${reference}" found`
      );
    }

    checkPermissions(req.user, transaction.user._id);

    res.status(StatusCodes.OK).json(
      response({
        msg: "Transaction retrived successfully",
        data: transaction,
      })
    );
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

module.exports = {
  getAllTransactions,
  getAllUserTransactions,
  getSingleTransaction,
  getTransactionByReference
};
