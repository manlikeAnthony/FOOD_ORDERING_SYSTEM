const User = require("../models/User");
const Vendor = require("../models/Vendor");
const Transaction = require("../models/Transaction");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { checkPermissions } = require("../utils");
const response = require("../responses/response");

const makeUserAnAdmin = async (req, res) => {
  try {
    const { id: userId } = req.params;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      throw new CustomError.NotFoundError(`no user with id ${userId} found`);
    }

    if (user.role !== "user") {
      throw new CustomError.BadRequestError(
        "Only users with role 'user' can be promoted to admin"
      );
    }
    user.role = "admin";
    await user.save();

    res.status(StatusCodes.OK).json(
      response({
        msg: "admin created sucessfuly",
        data: user,
        status: 200,
      })
    );
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const approveVendor = async (req, res) => {
  try {
    const { id: vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      throw new CustomError.NotFoundError(
        `no vendor with id ${vendorId} found`
      );
    }

    if (vendor.isApproved) {
      throw new CustomError.BadRequestError("Vendor is already approved");
    }

    vendor.isApproved = true;
    await vendor.save();

    res.status(StatusCodes.OK).json(
      response({
        msg: "vendor approved sucessfuly",
        data: vendor,
        status: 200,
      })
    );
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const getEveryone = async (req, res) => {
  //owner protected iykyk
  try {
    const everyone = await User.find({}).select("-password -favorites");
    res
      .status(StatusCodes.OK)
      .json(response({ mag: "Everyone fetched ", data: everyone }));
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select(
      "-password -favorites"
    );
    res
      .status(StatusCodes.OK)
      .json(response({ mag: "All admins fetched ", data: admins }));
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password");
    res
      .status(StatusCodes.OK)
      .json(response({ msg: "All user fetched", data: users }));
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const getAllDeliveryGuys = async (req, res) => {
  try {
    const deliveryGuys = await User.find({ role: "delivery" }).select(
      "name email status geoAddress -password"
    );

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "all delivery guys fetched", data: deliveryGuys }));
  } catch (error) {
    res
      .status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const banUser = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      throw new CustomError.NotFoundError(`no user with id ${userId} found`);
    }

    user.status = "banned";
    await user.save();

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "user has been banned", data: user, status: 200 }));
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const liftBan = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      throw new CustomError.NotFoundError(`no user with id ${userId} found`);
    }

    user.status = "available";
    await user.save();

    res
      .status(StatusCodes.OK)
      .json(
        response({
          msg: "Ban has been lifted. Please maintain appropraite character",
          data: user,
          status: 200,
        })
      );
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

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

module.exports = {
  makeUserAnAdmin,
  approveVendor,
  getEveryone,
  getAllAdmins,
  getAllUsers,
  getAllDeliveryGuys,
  banUser,
  liftBan,
  getAllTransactions,
};
