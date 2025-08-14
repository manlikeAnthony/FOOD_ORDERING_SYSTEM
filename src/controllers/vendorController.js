const User = require("../models/User");
const CustomError = require("../errors");
const Vendor = require("../models/Vendor");
const { checkPermissions } = require("../utils");
const response = require("../responses/response");
const { vendorValidator } = require("../validator/validate");

const applyAsVendor = async (req, res) => {
  try {
    const { error, value } = vendorValidator(req.body);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        response({
          msg: error.details.map((d) => d.message),
        })
      );
    }
    const { name, email, phone, address, description } = value;

    const existing = await Vendor.findOne({ user: req.user.userId });
    if (existing) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "You already applied or are a vendor" });
    }

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
      .json(response({ msg: "Vendor application submitted", data: vendor }));
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const getMyVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user.userId }).populate({
      path: "products",
      select: "name description price category image",
    });

    if (!vendor) {
      throw new CustomError.NotFoundError(`Vendor not found`);
    }

    res.status(StatusCodes.OK).json(response({ data: vendor }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const updateVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user.userId });
    if (!vendor) {
      throw new CustomError.NotFoundError(`Vendor not found`);
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
      .json(response({ msg: "Vendor profile updated", data: updatedVendor }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};
module.exports = { applyAsVendor, getMyVendorProfile, updateVendorProfile };
