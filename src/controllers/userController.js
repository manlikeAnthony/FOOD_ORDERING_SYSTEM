const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { checkPermissions } = require("../utils");
const response = require("../responses/response");

const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("-password -favorites");
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

const getSingleUser = async (req, res) => {
  try {
    const { id: userId } = req.params;

    const user = await User.findOne({ _id: userId })
      .select("-password")

    if (!user) {
      throw new CustomError.NotFoundError(`no user with id ${userId}`);
    }

    checkPermissions(req.user, user._id);

    res.status(StatusCodes.OK).json(response({ data: user }));
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const showCurrentUser = async (req, res) => {
  res.status(StatusCodes.OK).json(response({ data: { user: req.user } }));
};

const deleteUser = async (req, res) => {
  try {
    const {id : userId} = req.params
    const user = await User.findOne({ _id: userId });

    if (!user) {
      throw new CustomError.NotFoundError(`no user with id ${userId}`);
    }

    checkPermissions(req.user, user._id);

    await user.deleteOne();

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "User successfully deleted" }));
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

module.exports = {
  getAllAdmins,
  getAllUsers,
  getSingleUser,
  showCurrentUser,
  deleteUser,
};
