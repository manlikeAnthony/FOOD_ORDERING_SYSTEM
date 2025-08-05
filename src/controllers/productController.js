const Vendor = require("../models/Vendor");
const Product = require("../models/Product");
const User = require("../models/User");
const CustomError = require("../errors");
const { StatusCodes } = require("http-status-codes");
const checkPermissions = require("../utils/checkPermissions");


const createProduct = async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user.userId });
  if (!vendor) {
    throw new CustomError.NotFoundError("Vendor profile not found");
  }
  req.body.vendor = vendor._id;
  const product = await Product.create(req.body);
  res.status(StatusCodes.CREATED).json({ product });
};


const getAllProducts = async (req, res) => {
  const products = await Product.find({}).populate({
    path: "vendor",
    select: "name description",
  });
  res.status(StatusCodes.OK).json({ count: products.length, products });
};


const getVendorProducts = async (req, res) => {
  const { id: vendorId } = req.params;
  const products = await Product.find({ vendor: vendorId });
  res.status(StatusCodes.OK).json({ count: products.length, products });
};


const getSingleProduct = async (req, res) => {
  const { id: productId } = req.params;
  const product = await Product.findOne({ _id: productId }).populate({
    path: "vendor",
    select: "name description",
  });
  res.status(StatusCodes.OK).json({ product });
};

const updateProduct = async (req, res) => {
  const { id: productId } = req.params;
  const product = await Product.findOne({ _id: productId });
  if (!product) {
    throw new CustomError.NotFoundError(`no product with id ${productId}`);
  }
  const vendor = await Vendor.findOne({ _id: product.vendor });

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
};


const deleteProduct = async (req, res) => {
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
};


const toggleFavorite = async (req, res) => {
  const { productId } = req.params;
  const user = await User.findById(req.user.userId);

  if (!user) {
    throw new CustomError.NotFoundError("User not found");
  }
  const alreadyFavorited = user.favorites.includes(productId);
  if (alreadyFavorited) {
    user.favorites = user.favorites.filter((id) => id.toString() !== productId);
    await user.save();
    return res
      .status(StatusCodes.OK)
      .json({ msg: "Product removed from favorites" });
  }
  user.favorites.push(productId);
  await user.save();
  res.status(StatusCodes.OK).json({ msg: "Product added to favorites" });
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
