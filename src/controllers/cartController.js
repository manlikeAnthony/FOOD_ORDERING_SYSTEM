const Cart = require("../models/Cart");
const CustomError = require("../errors");
const Product = require("../models/Product");
const response = require("../responses/response");
const { StatusCodes } = require("http-status-codes");
const { addToCartValidator } = require("../validator/validate");

// Add item or update quantity
const addToCart = async (req, res) => {
  const { error, value } = addToCartValidator(req.body);

  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      msg: error.details.map((d) => d.message),
    });
  }

  const { productId, quantity } = value;
  const userId = req.user.userId;

  try {
    const product = await Product.findById(productId);
    
    if (!product) {
      throw CustomError.NotFoundError(
        `Product with id ${productId} not found `
      );
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

    return res.status(StatusCodes.OK).json(
      response({
        msg: "cart updated successfully",
        data: cart,
        status: StatusCodes.OK,
      })
    );
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      response({
        msg: error.message,
        status: StatusCodes.INTERNAL_SERVER_ERROR,
      })
    );
  }
};

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId }).populate(
      "items.product",
      "name price image"
    );

    if (!cart) {
      throw new CustomError.NotFoundError(`Cart not found`);
    }

    res.status(StatusCodes.OK).json(
      response({
        msg: "cart retrieved sucessfully",
        data: { count: cart.items.length, cart },
        status: StatusCodes.OK,
      })
    );
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
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
      throw CustomError.NotFoundError(`Cart not found`);
    }

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => item.product._id.toString() !== productId
    );

    if (cart.items.length === initialLength) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(response({ msg: "Product not found in cart" }));
    }

    await cart.save();

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "Item removed", data: cart }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ user: req.user.userId });
    res.status(StatusCodes.OK).json(response({ msg: "Cart cleared" }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

module.exports = {
  addToCart,
  getCart,
  removeFromCart,
  clearCart,
};
