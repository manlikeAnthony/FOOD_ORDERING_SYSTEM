const User = require("../models/User");
const Vendor = require("../models/Vendor");
const CustomError = require("../errors");
const { checkPermissions } = require("../utils");

const applyAsVendor = async (req, res) => {
  try {
    const existing = await Vendor.findOne({ user: req.user.userId });
    if (existing) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "You already applied or are a vendor" });
    }

    const { name, email, phone, address, description } = req.body;

    const vendor = await Vendor.create({
      user: req.user.userId,
      name,
      email,
      phone,
      address,
      description,
    });

    const user = await User.findById(req.user.userId);
    user.role = "vendor";
    await user.save();

    res
      .status(StatusCodes.CREATED)
      .json({ msg: "Vendor application submitted", vendor });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
  }
};

const getMyVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user.userId }).populate({
      path: "products",
      select: "name description price category image",
    });

    if (!vendor) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "No vendor profile found" });
    }

    res.status(StatusCodes.OK).json({ vendor });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
  }
};

const updateVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user.userId });
    if (!vendor) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "No vendor profile found" });
    }

    checkPermissions(req.user, vendor.user);

    const updatedVendor = await Vendor.findOneAndUpdate(
      { user: req.user.userId },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res
      .status(StatusCodes.OK)
      .json({ msg: "Vendor profile updated", updatedVendor });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
  }
};
module.exports = { applyAsVendor, getMyVendorProfile, updateVendorProfile };
