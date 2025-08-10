const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");

// Add item or update quantity
const addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.user.userId;
  try {
    if (!productId || !quantity) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Product ID and quantity required" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Product not found" });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [{ product: productId, quantity }],
      });
    } else {
      const index = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (index !== -1) {
        cart.items[index].quantity = quantity;
      } else {
        cart.items.push({ product: productId, quantity });
      }

      await cart.save();
    }

    res.status(StatusCodes.OK).json({ cart });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
  }
};

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId }).populate(
      "items.product",
      "name price image"
    );

    if (!cart) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Cart not found" });
    }

    res.status(StatusCodes.OK).json({ count: cart.items.length, cart });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const cart = await Cart.findOne({ user: req.user.userId }).populate(
      "items.product",
      "name price image"
    );

    if (!cart) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Cart not found" });
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item.product._id.toString() !== productId
    );

    if (cart.items.length === initialLength) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Product not found in cart" });
    }

    await cart.save();

    res.status(StatusCodes.OK).json({ msg: "Item removed", cart });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
  }
};

const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user.userId });
    res.status(StatusCodes.OK).json({ msg: "Cart cleared" });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ msg: error.message });
  }
};

module.exports = {
  addToCart,
  getCart,
  removeFromCart,
  clearCart,
};
