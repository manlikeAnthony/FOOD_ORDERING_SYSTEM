const User = require("../models/User");
const CustomError = require("../errors");
const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const response = require("../responses/response");
const { StatusCodes } = require("http-status-codes");
const { productValidator } = require("../validator/validate");
const checkPermissions = require("../utils/checkPermissions");
const s3 = require("../AWS/s3");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const CONFIG = require("../config/index");

const createProduct = async (req, res) => {
  try {
    const { error, value } = productValidator(req.body);

    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: error.details.map((d) => d.message),
      });
    }

    const vendor = await Vendor.findOne({ user: req.user.userId });
    if (!vendor) {
      throw new CustomError.NotFoundError("Vendor profile not found");
    }

    if (!vendor.isApproved) {
      throw new CustomError.UnauthorizedError("You are not approved");
    }

    let imageUrl = null;

    if (req.file) {
      const fileName = `products/${vendor._id}/${Date.now()}-${
        req.file.originalname
      }`;

      const params = {
        Bucket: CONFIG.AWS.BUCKET_NAME,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      await s3.send(new PutObjectCommand(params));

      imageUrl = `https://${CONFIG.AWS.BUCKET_NAME}.s3.${CONFIG.AWS.BUCKET_REGION}.amazonaws.com/${fileName}`;
    }

    const product = await Product.create({
      ...value,
      vendor: vendor._id,
      image: imageUrl,
    });

    res.status(StatusCodes.CREATED).json(response({ data: product }));
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json(response({ msg: error.message }));
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}).populate({
      path: "vendor",
      select: "name description",
    });

    res
      .status(StatusCodes.OK)
      .json(response({ data: { count: products.length, products } }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const getVendorProducts = async (req, res) => {
  try {
    const { id: vendorId } = req.params;

    const products = await Product.find({ vendor: vendorId }).populate({
      path: "reviews",
      select: "rating title",
    });

    res
      .status(StatusCodes.OK)
      .json(response({ data: { count: products.length, products } }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const getSingleProduct = async (req, res) => {
  try {
    const { id: productId } = req.params;

    const product = await Product.findOne({ _id: productId })
      .populate({ path: "reviews", select: "rating title" })
      .populate({
        path: "vendor",
        select: "name description",
      });

    if (!product) {
      throw new CustomError.NotFoundError("Product not found");
    }

    res.status(StatusCodes.OK).json(response({ data: product }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id: productId } = req.params;

    const product = await Product.findOne({ _id: productId });
    if (!product) {
      throw new CustomError.NotFoundError(`No product with id ${productId}`);
    }

    const vendor = await Vendor.findOne({ _id: product.vendor });
    if (!vendor) {
      throw new CustomError.NotFoundError("Vendor profile not found");
    }

    checkPermissions(req.user, vendor.user);

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(StatusCodes.OK).json(response({ data: updatedProduct }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id: productId } = req.params;

    const product = await Product.findOne({ _id: productId });
    if (!product) {
      throw new CustomError.NotFoundError(`No product with id ${productId}`);
    }

    const vendor = await Vendor.findOne({ _id: product.vendor });
    if (!vendor) {
      throw new CustomError.NotFoundError("Vendor profile not found");
    }

    checkPermissions(req.user, vendor.user);

    await product.deleteOne();

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "Product deleted successfully" }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const toggleFavorite = async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new CustomError.NotFoundError("User not found");
    }

    const alreadyFavorited = user.favorites.includes(productId);

    if (alreadyFavorited) {
      user.favorites = user.favorites.filter(
        (id) => id.toString() !== productId
      );
      await user.save();

      return res
        .status(StatusCodes.OK)
        .json(response({ msg: "Product removed from favorites" }));
    }

    user.favorites.push(productId);

    await user.save();

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "Product added to favorites" }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const updateProductImage = async (req, res) => {
  try {
    const { id: productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      throw new CustomError.NotFoundError(
        `Product with id ${productId} not found`
      );
    }

    const vendor = await Vendor.findOne({ _id: product.vendor });
    
    if (!vendor) {
      throw new CustomError.NotFoundError("Vendor profile not found");
    }
    
    checkPermissions(req.user, vendor.user);

    if (!req.file) {
      return res.status(400).json(response({ msg: "No file uploaded" }));
    }

    const fileName = `products/${vendor._id}/${Date.now()}-${
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

    const imageUrl = `https://${CONFIG.AWS.BUCKET_NAME}.s3.${CONFIG.AWS.BUCKET_REGION}.amazonaws.com/${fileName}`;

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId },
      { image: imageUrl },
      { new: true, runValidators: true }
    );

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "image updated successfully", data: updatedProduct }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  getVendorProducts,
  updateProduct,
  deleteProduct,
  toggleFavorite,
  updateProductImage,
};
