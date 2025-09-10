const User = require("../models/User");
const CustomError = require("../errors");
const Vendor = require("../models/Vendor");
const { checkPermissions } = require("../utils");
const response = require("../responses/response");
const { StatusCodes } = require("http-status-codes");
const { vendorValidator } = require("../validator/validate");
const s3 = require("../AWS/s3");
const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const CONFIG = require("../config/index");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

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
    let fileName;

    if (req.file) {
      fileName = `vendors/${req.user.userId}/${Date.now()}-${
        req.file.originalname
      }`;

      const params = {
        Bucket: CONFIG.AWS.BUCKET_NAME,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      await s3.send(new PutObjectCommand(params));
    }

    const vendorData = {
      user: req.user.userId,
      name,
      email,
      phone,
      address,
      description,
    };

    if (fileName) vendorData.logo = fileName; 

    const vendor = await Vendor.create(vendorData);


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
    const vendors = await Vendor.find({})
      .populate({ path: "user", select: "name email" })
      .lean();

    for (const vendor of vendors) {
      if (vendor.logo) {
        const getObjectParams = {
          Bucket: CONFIG.AWS.BUCKET_NAME,
          Key: vendor.logo,
        };
        const command = new GetObjectCommand(getObjectParams);
        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        vendor.logo = url;
      }
    }

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

    const getObjectParams = {
      Bucket: CONFIG.AWS.BUCKET_NAME,
      Key: vendor.logo,
    };

    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    vendor.logo = url;

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
    let fileName;

    if (req.file) {
      fileName = `vendors/${req.user.userId}/${Date.now()}-${
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
    }

    const updateData = {
      ...req.body,
    };

    if (fileName) {
      updateData.logo = fileName; // only update logo if file was uploaded
    }

    const updatedVendor = await Vendor.findOneAndUpdate(
      { user: req.user.userId },
      updateData,
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

    const vendor = await Vendor.findOneAndUpdate(
      { user: req.user.userId },
      { logo: fileName },
      { new: true, runValidators: true }
    );

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "image updated successfully", data: vendor }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const deleteVendor = async (req, res) => {
  try {
    const { id: vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      throw new CustomError.NotFoundError(
        `no vendor with id ${vendorId} found`
      );
    }
    checkPermissions(req.user, vendor.user);

    const user = await User.findById(vendor.user);

    if (user) {
      user.role = "user";
      await user.save();
    }

    if (vendor.logo) {
      const params = {
        Bucket: CONFIG.AWS.BUCKET_NAME,
        Key: vendor.logo,
      };

      const command = new DeleteObjectCommand(params);
      await s3.send(command);
    }
    vendor.deleteOne();

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "Vendor Deleted successfully" }));
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
