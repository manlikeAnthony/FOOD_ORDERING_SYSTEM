const User = require("../models/User");
const CustomError = require("../errors");
const Vendor = require("../models/Vendor");
const { checkPermissions } = require("../utils");
const response = require("../responses/response");
const { StatusCodes } = require("http-status-codes");
const { vendorValidator } = require("../validator/validate");
const s3 = require("../AWS/s3");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const CONFIG = require("../config/index");

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

    let logoUrl = null;

    if (req.file) {
      const fileName = `vendors/${req.user.userId}/${Date.now()}-${
        req.file.originalname
      }`;

      const params = {
        Bucket: CONFIG.AWS.BUCKET_NAME,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      await s3.send(new PutObjectCommand(params));

      logoUrl = `https://${CONFIG.AWS.BUCKET_NAME}.s3.${CONFIG.AWS.BUCKET_REGION}.amazonaws.com/${fileName}`;
    }

    const vendor = await Vendor.create({
      user: req.user.userId,
      name,
      email,
      phone,
      address,
      description,
      logo: logoUrl,
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
const approveVendor = async (req, res) => {
  try {
    const { id: vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      throw new CustomError.NotFoundError("Vendor not found");
    }

    // Mark vendor as approved
    vendor.isApproved = true;
    await vendor.save();

    res.status(StatusCodes.OK).json(
      response({
        msg: "Vendor approved successfully",
        data: vendor,
      })
    );
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const getAllVendors = async (req, res) => {
  try {
    const vendors = await User.find({ role: "vendor" }).select("-password");

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "All vendors fetched", data: vendors }));
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const getMyVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user.userId })
      .populate({
        path: "products",
        select: "name description price category image",
      })
      .populate({ path: "user", select: "name email" });

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

const updateLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(response({ msg: "No file uploaded" }));
    }
    // resize the image
    // const buffer = await sharp(req.file.buffer)
    //   .resize({ height: 1920, width: 1080, fit: "contain" })
    //   .toBuffer();

    const fileName = `vendors/${req.user.userId}/${Date.now()}-${
      req.file.originalname
    }`;

    const params = {
      Bucket: CONFIG.AWS.BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const command = new PutObjectCommand(params);

    await s3.send(command);

    const logoUrl = `https://${CONFIG.AWS.BUCKET_NAME}.s3.${CONFIG.AWS.BUCKET_REGION}.amazonaws.com/${fileName}`;

    const vendor = await Vendor.findOneAndUpdate(
      { user: req.user.userId },
      { logo: logoUrl },
      { new: true, runValidators: true }
    );

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "image updated successfully", data: vendor }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

module.exports = {
  applyAsVendor,
  approveVendor,
  getAllVendors,
  updateLogo,
  getMyVendorProfile,
  updateVendorProfile,
};
