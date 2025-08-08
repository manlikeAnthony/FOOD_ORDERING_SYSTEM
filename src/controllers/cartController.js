const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Add item or update quantity
const addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.userId;

  if (!productId || !quantity) {
    throw new CustomError.BadRequestError("Product ID and quantity required");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new CustomError.NotFoundError("Product not found");
  }

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({
      user: userId,
      items: [{ product: productId, quantity }],
    });
  } else {
    const index = cart.items.findIndex((item) =>
      item.product.toString() === productId
    );

    if (index !== -1) {
      cart.items[index].quantity = quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
  }

  res.status(StatusCodes.OK).json({ cart });
};

const getCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.userId }).populate(
    "items.product",
    "name price image"
  );

  if (!cart) {
    throw new CustomError.NotFoundError("Cart not found");
  }

  res.status(StatusCodes.OK).json({ count: cart.length ,cart });
};

// Remove one product from cart
const removeFromCart = async (req, res) => {
  const { productId } = req.params;
  const cart = await Cart.findOne({ user: req.user.userId }).populate(
    "items.product",
    "name price image"
  );

  if (!cart) {
    throw new CustomError.NotFoundError("Cart not found");
  }
  const initialLength = cart.items.length;
  cart.items = cart.items.filter(
    (item) => item.product._id.toString() !== productId
  );

  if (cart.items.length === initialLength) {
    throw new CustomError.NotFoundError("Product not found in cart");
  }

  await cart.save();

  res.status(StatusCodes.OK).json({ msg: "Item removed", cart });
};

// Clear cart
const clearCart = async (req, res) => {
  await Cart.findOneAndDelete({ user: req.user.userId });
  res.status(StatusCodes.OK).json({ msg: "Cart cleared" });
};

module.exports = {
  addToCart,
  getCart,
  removeFromCart,
  clearCart,
};