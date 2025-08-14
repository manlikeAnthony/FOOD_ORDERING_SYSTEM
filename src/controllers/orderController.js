const User = require("../models/User");
const Cart = require("../models/Cart");
const CustomError = require("../errors");
const Order = require("../models/Order");
const Product = require("../models/Product");
const response = require("../responses/response");
const { checkPermissions } = require("../utils");
const { StatusCodes } = require("http-status-codes");
const stripe = require("stripe")(process.env.STRIPE_API_KEY);

const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const cart = await Cart.findOne({ user: userId }).populate(
      "items.product",
      "name price"
    );
    if (!cart || cart.items.length === 0) {
      throw new CustomError.BadRequestError("Your cart is empty");
    }

    let orderItems = [];
    let subtotal = 0;

    cart.items.forEach((item) => {
      orderItems.push({
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        product: item.product._id,
      });
      subtotal += item.product.price * item.quantity;
    });

    const tax = subtotal * 0.1; // 10% example
    const shippingFee = 500; // NGN 500 example
    const total = subtotal + tax + shippingFee;

    const order = await Order.create({
      user: userId,
      orderItems,
      subtotal,
      tax,
      shippingFee,
      total,
      status: "pending",
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: orderItems.map((item) => ({
        price_data: {
          currency: "ngn",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      success_url: "http://localhost:5000/api/v1/order/success",
      cancel_url: "http://localhost:5000/api/v1/order/cancel",
      metadata: {
        userId: userId,
        orderId: order._id.toString(),
      },
    });

    order.stripeSessionId = session.id;
    await order.save();

    res.status(StatusCodes.CREATED).json(
      response({
        msg: "Order created",
        data: { checkoutUrl: session.url },
      })
    );
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const webhook = async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { orderId, userId } = session.metadata;

      if (orderId) {
        await Order.findByIdAndUpdate(orderId, { status: "paid" });
        await Cart.findOneAndDelete({ user: userId });
        console.log(`Order ${orderId} marked as paid`);
      }
    }
    res.json({ received: true });
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({}).populate("user", "name email");
    res
      .status(StatusCodes.OK)
      .json(response({ data: { count: orders.length, orders } }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const getAllMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.userId });
    res
      .status(StatusCodes.OK)
      .json(response({ data: { count: orders.length, orders } }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const getSingleOrder = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const order = await Order.findOne({ _id: orderId }).populate(
      "orderItems.product"
    );
    if (!order) throw new CustomError.NotFoundError("Order not found");

    checkPermissions(req.user, order.user);
    res.status(StatusCodes.OK).json(response({ data: order }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const order = await Order.findOne({ _id: orderId });
    if (!order) throw new CustomError.NotFoundError("Order not found");

    order.status = req.body.status || order.status;
    await order.save();

    res
      .status(StatusCodes.OK)
      .json(response({ msg: "Order status updated", data: order }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const order = await Order.findOne({ _id: orderId });
    if (!order) throw new CustomError.NotFoundError("Order not found");

    checkPermissions(req.user, order.user);

    if (order.status === "paid") {
      throw new CustomError.BadRequestError("Cannot cancel a paid order");
    }

    await order.remove();
    res.status(StatusCodes.OK).json(response({ msg: "Order canceled" }));
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json(response({ msg: error.message }));
  }
};

module.exports = {
  createOrder,
  webhook,
  getAllOrders,
  getAllMyOrders,
  getSingleOrder,
  updateOrderStatus,
  cancelOrder,
};
