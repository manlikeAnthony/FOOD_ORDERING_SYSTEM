const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const User = require("../models/User");
const CustomError = require("../errors");
const { StatusCodes } = require("http-status-codes");
const checkPermissions = require("../utils/checkPermissions");

const createProduct = async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ user: req.user.userId });
    if (!vendor) {
      throw new CustomError.NotFoundError("Vendor profile not found");
    }

    req.body.vendor = vendor._id;
    const product = await Product.create(req.body);
    res.status(StatusCodes.CREATED).json({ product });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}).populate({
      path: "vendor",
      select: "name description",
    });
    res.status(StatusCodes.OK).json({ count: products.length, products });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
  }
};

const getVendorProducts = async (req, res) => {
  try {
    const { id: vendorId } = req.params;
    const products = await Product.find({ vendor: vendorId }).populate({
      path: "reviews",
      select: "rating title",
    });
    res.status(StatusCodes.OK).json({ count: products.length, products });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
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

    res.status(StatusCodes.OK).json({ product });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
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

    res.status(StatusCodes.OK).json({ updatedProduct });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
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
    res.status(StatusCodes.OK).json({ msg: "Product deleted successfully" });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
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
        .json({ msg: "Product removed from favorites" });
    }

    user.favorites.push(productId);
    await user.save();
    res.status(StatusCodes.OK).json({ msg: "Product added to favorites" });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
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
};
